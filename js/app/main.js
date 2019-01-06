define(["require", "jquery", "data/ages", "data/abilities", "data/locations", "data/regions", "data/itemsAndSongs", "data/itemChecks", "classes/inventory", "classes/itemCheck", "data/settings"], function(require, $, Age, Abilities, Locations, Regions, Items, ItemChecks, Inventory, ItemCheck, Settings) {
  var toSlug = function(str){ return str.replace(/['\(\)]/g, '').replace(/\s/g, '-').toLowerCase(); };
  var toKey = function(str){ return str.replace(/['\(\)]/g, '').replace(/[\s-]/g, '_').toUpperCase(); };
  window.itemChecksByLocation = {};
  window.Items = Items;

  var generateLocationList = function(container, regions){
    var region, location, header, keys;
    $.each(regions, function(regionName, locations){
      region = $('<div/>').addClass('region').addClass(toSlug(regionName)).attr('data-region', toSlug(regionName));
      region.append($('<h2/>').text(regionName));
      locations.forEach(function(locationName){
        location = $('<div/>').addClass('location').attr('data-location', toKey(locationName));
        header = $('<h3/>').append($('<span/>').addClass('location-name').text(locationName));
        if (Items['BIG_KEY_' + locationName] || Items['SMALL_KEY_' + locationName]){
          location.addClass('has-keys');
          region.addClass('has-keys');
          keys = $('<div/>').addClass('keys');
          if (Items['BIG_KEY_' + locationName]){
            keys.append(
              $('<div/>').addClass('item').
                attr('data-item', 'BIG_KEY_' + locationName).
                attr('data-original-item', 'BIG_KEY_' + locationName).
                append($('<img/>').attr('src', 'images/BIG_KEY.png'))
            );
          }
          if (Items['SMALL_KEY_' + locationName]){
            keys.append(
              $('<div/>').addClass('item').
                attr('data-item', 'SMALL_KEY_' + locationName).
                attr('data-original-item', 'SMALL_KEY_' + locationName).
                append($('<img/>').attr('src', 'images/SMALL_KEY.png')).
                append($('<span/>').addClass('count'))
            );
          }
          header.append(keys);
        }
        location.append(header);
        location.append($('<ul/>').addClass('item-checks'));
        region.append(location);
      });
      container.append(region);
    });
  };

  var generateChecklist = function(checks){
    checks.forEach(function(check){
      $('[data-location="'+toKey(check.location)+'"] ul').append(
        $('<li/>').addClass('item-check').addClass('inaccessible').attr('data-check', check.name).append(
          $('<input type="checkbox"/>').attr('id', toSlug(check.location) + '-' +toSlug(check.name))
        ).append(
          $('<label />').text(check.name).attr('for', toSlug(check.location) + '-' +toSlug(check.name))
        )
      );
      itemChecksByLocation[check.location] = itemChecksByLocation[check.location] || {};
      itemChecksByLocation[check.location][check.name] = check;
    });
  };

  var generateSettingsList = function(table, settings){
    var $tr, $td, $input, first;
    $.each(settings, function(setting, values){
      $tr = $('<tr/>').append($('<td/>').text(setting)).attr('data-setting', toSlug(setting));
      $td = $('<td/>');
      if (typeof values === 'object'){
        $input = $('<select/>').attr('name', toKey(setting));
        $.each(values, function(key, value){
          $input.append($('<option/>').val(key).text(value));
        });
        $td.append($input);
      } else {
        $input = $('<input type="checkbox"/>').attr('name', toKey(setting)).val(toKey(setting));
        if (values) $input.attr('checked', 'checked');
        $td.append($input);
      }
      table.append($tr.append($td));
    });
  };

  var showPopup = function(selector){
    $(selector).show();
    $('#overlay').show();
  }

  var hidePopup = function(){
    $('#overlay').hide();
    $('.popup').hide();
  };

  var ItemTracker = function(){
    this.collect = function(e){
      var $elem = $(e.target).closest('.item');
      var item = Items[$elem.attr('data-item')];

      if (typeof item.count === "number"){
        if (item.count < item.max) item.count++;
        $elem.find('.count').text(item.count);
      }
      if ($elem.hasClass('collected')){
        if (item.next){
          var newItem = this.inventory.upgrade(item);
          $elem.attr('data-item', newItem.key);
          $elem.find('img').attr('src', 'images/' + newItem.key + '.png');
        } else if (typeof item.count !== "number"){
          this.inventory.remove(item);
          $elem.removeClass('collected');
          if ($elem.attr('data-item') != $elem.attr('data-original-item')){
            $elem.attr('data-item', $elem.attr('data-original-item'));
            $elem.find('img').attr('src', 'images/' + $elem.attr('data-original-item') + '.png');
          }
        }
      } else {
        this.inventory.add(item);
        $elem.addClass('collected');
      }
      this.refreshAccessible();
    }.bind(this);

    this.uncollect = function(e){
      e.preventDefault();
      var $elem = $(e.target).closest('.item');
      var item = Items[$elem.attr('data-item')];

      if (typeof item.count === "number"){
        if (item.count){
          item.count--;
        }
        if (!item.count){
          this.inventory.remove(item);
          $elem.removeClass('collected');
        }
        $elem.find('.count').text(item.count);
      }
      if ($elem.hasClass('collected')){
        if (item.prev()){
          var newItem = this.inventory.downgrade(item);
          $elem.attr('data-item', newItem.key);
          $elem.find('img').attr('src', 'images/' + newItem.key + '.png');
        } else if (typeof item.count !== "number"){
          this.inventory.remove(item);
          $elem.removeClass('collected');
        }
      }
      this.refreshAccessible();
      return false;
    }.bind(this);

    this.check = function(e){
      var $box = $(e.target), $check = $(e.target).closest('.item-check');
      var location = Locations[$check.closest('.location').attr('data-location')];
      var itemCheck = itemChecksByLocation[location][$check.attr('data-check')];
      var preset = itemCheck.presetItem(this.inventory);
      if ($box.is(':checked')){
        $check.addClass('collected');
        this.inventory.check(itemCheck);
        if (preset && !this.inventory.hasItem(preset))
          $('.item[data-item=' + preset.key + ']').click();
      } else {
        $check.removeClass('collected');
        this.inventory.uncheck(itemCheck);
        if (preset && this.inventory.hasItem(preset))
          $('.item[data-item=' + preset.key + ']').contextmenu();
      }
      this.refreshAccessible();
    }.bind(this);

    this.changeAge = function(){
      $('.collected').addClass('no-animation');
      this.inventory.age = this.currentAge();
      this.refreshAccessible();
      this.applySettings();
    }.bind(this);

    this.applySettings = function(){
      form = $('#settings');
      settings = {};
      form.serializeArray().forEach(function(x){
        settings[toKey(x.name)] = x.value;
      });
      form.find(':checkbox').each(function(){
        settings[toKey(this.name)] = this.checked;
      });
      this.settings = settings;
      this.inventory.settings = settings;

      // TODO: calculate Go mode based on FG and bridge in settings

      if (settings.SHOW_OBTAINABLE_ONLY){
        $('#locations').addClass('hide-inaccessible');
      } else {
        $('#locations').removeClass('hide-inaccessible');
      }

      if (settings.KEYSANITY){
        $('#locations').addClass('keysanity');
      } else {
        $('#locations').removeClass('keysanity');
      }

      if (settings.HIDE_COLLECTED){
        $('#locations').addClass('hide-collected');
      } else {
        $('#locations').removeClass('hide-collected');
      }
      this.refreshAccessible();
    }.bind(this);

    this.currentAge = function(){
      return Age[$('#age-selector').serializeArray()[0].value];
    };

    this.refreshAccessible = function(){
      this.saveInventory("zootr");
      ItemChecks.forEach(function(check){
        var $elem = $('#' + toSlug(check.location) + '-' + toSlug(check.name)).closest('.item-check');
        if (check.available(this.inventory, this.currentAge())){
          $elem.removeClass('inaccessible');
        } else {
          $elem.addClass('inaccessible');
        }
      }.bind(this));
      ['.location', '.region'].forEach(function(selector){
        $(selector).each(function(){
          if ($(this).find('.item-check:not(.inaccessible)').length){
            $(this).removeClass('inaccessible');
          } else {
            $(this).addClass('inaccessible');
          }
          if ($(this).find('.item-check:not(.collected)').length){
            $(this).removeClass('collected');
          } else {
            $(this).addClass('collected');
          }
        });
      });
    }.bind(this);

    this.checkPedestal = function(e){
      e.preventDefault();
      this.pedestalHints = [];
      showPopup('#check-pedestal-popup');
      return false;
    }.bind(this);

    this.recordPedestalHint = function(e){
      var button = $(e.target).closest('.pedestal-hint'), dungeonItems = {};
      this.pedestalHints.push(button.val());
      button.prop('disabled', true);

      dungeonItems[Age.CHILD] = ['KOKIRI_EMERALD','GORONS_RUBY','ZORAS_SAPPHIRE'];
      dungeonItems[Age.ADULT] = ['FOREST_MEDALLION','FIRE_MEDALLION','WATER_MEDALLION','SHADOW_MEDALLION','SPIRIT_MEDALLION','LIGHT_MEDALLION'];

      if ((this.pedestalHints.length == 3 && this.currentAge() == Age.CHILD) || this.pedestalHints.length == 6 && this.currentAge() == Age.ADULT){
        for (var i = 0; i < this.pedestalHints.length; i++){
          $('.item[data-item=' + dungeonItems[this.currentAge()][i] + '] .subtitle').text(this.pedestalHints[i]);
        }
        this.pedestalHints = [];
        hidePopup();
        $('.pedestal-hint').prop('disabled', false);
      }
    }.bind(this);

    this.loadInventory = function(key){
      return (window.localStorage.getItem(key) || "")
        .split(",")
        .filter(x => !!x)
        .map(x => Items[x]);
    }.bind(this);

    this.saveInventory = function(key){
      window.localStorage.setItem(key, this.inventory.items.map(x => x.key));
    }.bind(this);

    this.initializeItemIconsFrom = function(inv){
      console.log("Loaded saved items:", inv.map(x => x.name));
      for (var n in inv) {
        var item = inv[n];
        var button = $('.item[data-original-item=' + item.basekey + ']');
        // This is super gross.
        // The item checkboxes don't use any sort of reactive UI, so to make
        // sure the display and data layers stay in sync we instead simulate
        // clicks on each one.
        while (!button.hasClass("collected") || button[0].getAttribute("data-item") != item.key) {
          button.click();
        }

      }
    }

    this.init = function(){
      this.inventory = new Inventory(
        [], //this.loadInventory("zootr"),
        [Locations.KOKIRI_FOREST, Locations.LOST_WOODS]);
      this.settings = {};
      $('.item').click(this.collect);
      $('.item').contextmenu(this.uncollect);
      $('.item-check [type="checkbox"]').on('change', this.check);
      $('#age-selector input').on('change', this.refreshAccessible);
      $('#age-selector').on('change', this.changeAge);
      $('#settings input, #settings select').on('change', this.applySettings);
      $('#check-pedestal').submit(this.checkPedestal);
      $('#read-pedestal .pedestal-hint').click(this.recordPedestalHint);
      this.initializeItemIconsFrom(this.loadInventory("zootr"));
      this.applySettings();
    }.bind(this);
  };

  $(function(){
    generateLocationList($('#locations .locations'), Regions);
    generateChecklist(ItemChecks);
    generateSettingsList($('#settings table'), Settings);
    window.checks = ItemChecks;
    window.tracker = new ItemTracker();
    window.tracker.init();
  });
});
