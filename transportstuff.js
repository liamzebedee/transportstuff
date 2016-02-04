Offers = new Meteor.Collection('offers')


function latlngToLnglat(latlng) {
  return [latlng[1], latlng[0]]
}

Offer = function Offer(from, to, date, kilograms, contactinfo, from_c, to_c) {
  this.from = from
  this.to = to
  this.from_c = { type: "Point", coordinates: [from_c[1], from_c[0]] }
  this.to_c = { type: "Point", coordinates: [to_c[1], to_c[0]] }
  this.date = date
  this.kilograms = kilograms

  this.contactinfo = contactinfo
}

if (Meteor.isClient) {
  Template.demands.events({
    'submit .search': function(ev) {
      ev.preventDefault();

      var form = ev.target;
      var from = form.from.value;
      var dest = form.destination.value;
      
      if(from) {
        Meteor.call('geocode', from, function(err, res) {
          Session.set('from_c', res)
        })
      }
      if(dest) {
        Meteor.call('geocode', dest, function(err, res) {
          Session.set('to_c', res)
        })
      }

    }
  })

  Template.demands.helpers({
    demands: function() {
      var q = {};
      var from_c = Session.get('from_c')
      var to_c = Session.get('to_c')

      if(from_c) {
        q.from_c = {
          $near: {
            $geometry: { type: "Point",  coordinates: latlngToLnglat(from_c) },
            // $minDistance: 0,
            $maxDistance: 100000
          }
        }
      }

      if(to_c) {
        q.to_c = {
          $near: {
            $geometry: { type: "Point",  coordinates: latlngToLnglat(to_c) },
            // $minDistance: 0,
            $maxDistance: 100000
          }
        }
      }

      console.log(q)
      var offers = Offers.find(q)
      
      return offers.fetch()
    }

  });

  Template.offers.events({
    'submit .new-offer-form': function(ev) {
      event.preventDefault();
      var form = ev.target;
      var offer = Meteor.call('addOffer', form.from.value, form.to.value, form.date.value, form.kg.value, form.contactinfo.value)
    }
  });
}


if (Meteor.isServer) {
  Meteor.startup(function () {
    Offers._ensureIndex({'from_c':'2dsphere'});
    Offers._ensureIndex({'to_c':'2dsphere'});

    function getcoords(loc) {
      var geo = new GeoCoder()
      var response = geo.geocode({ address: loc })
      var data = response[0]
      if(!data) { console.error(response) }
      return [data.latitude, data.longitude]
    }

    Meteor.methods({
      geocode: function(loc) {
        return getcoords(loc)
      },

      addOffer: function(from, to, date, kilograms, contactinfo) {
        var from_c = getcoords(from)
        var to_c = getcoords(to)
        Offers.insert(new Offer(from, to, date, kilograms, contactinfo, from_c, to_c))
      }
    });
  });
}
