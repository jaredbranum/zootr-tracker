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
        if (Items['BIG_KEY_' + toKey(locationName)] || Items['SMALL_KEY_' + toKey(locationName)]){
          location.addClass('has-keys');
          region.addClass('has-keys');
          keys = $('<div/>').addClass('keys');
          if (Items['BIG_KEY_' + toKey(locationName)]){
            keys.append(
              $('<div/>').addClass('item').
                attr('data-item', 'BIG_KEY_' + toKey(locationName)).
                attr('data-original-item', 'BIG_KEY_' + toKey(locationName)).
                append($('<img/>').attr('src', 'images/BIG_KEY.png'))
            );
          }
          if (Items['SMALL_KEY_' + toKey(locationName)]){
            keys.append(
              $('<div/>').addClass('item').
                attr('data-item', 'SMALL_KEY_' + toKey(locationName)).
                attr('data-original-item', 'SMALL_KEY_' + toKey(locationName)).
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

  var generateSpawnList = function(container){
    var button;
    $.each(Locations, function(_, location){
      button = $('<button>').attr('type', 'button').addClass('spawn-location').val(location).text(location);
      container.append(button);
    });
  };

  var generateChecklist = function(checks){
    checks.forEach(function(check){
      $('[data-location="'+toKey(check.location)+'"] ul').append(
        $('<li/>').addClass('item-check').addClass('inaccessible').attr('data-check', check.name).append(
          $('<input type="checkbox"/>').attr('id', toSlug(check.location) + '-' +toSlug(check.name))
        ).append(
          $('<label />').text(check.name).attr('for', toSlug(check.location) + '-' +toSlug(check.name))
        ).append(
          $('<span />').addClass('peek-controls').append(
            $('<span />').text('(?)').addClass('unseen')
          ).append(
            $('<img />').addClass('peek-item').addClass('seen')
          )
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

  var generateKey = function(){
    if (window.location.hash) return;
    var key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    window.location.hash = key;
    window.location.reload();
  };

  var setupPopups = function(){
    $(document).on('keydown', function(e){
      if (e.which == 27){ // ESC key
        hidePopup();
      }
    });
    $('#overlay').click(function(e){
      if ($(e.target).closest('.popup').length){
        return false;
      }
      hidePopup();
    });
  };

  var showPopup = function(selector){
    var popup = $(selector);
    popup.show();
    $('#overlay').show();
    return popup;
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
        if (preset && (!this.inventory.hasItem(preset) || (preset.supers && preset.supers.length)))
          $('.item[data-item=' + preset.key + ']').click();
      } else {
        $check.removeClass('collected');
        this.inventory.uncheck(itemCheck);
        if (preset && this.inventory.hasItem(preset))
          $('.item[data-item=' + preset.key + ']').contextmenu();
      }
      this.refreshAccessible();
    }.bind(this);

    this.peek = function(e){
      var popup = showPopup('#peek-item-popup');
      var check = $(e.target).closest('.item-check');
      popup.find('.peek-check-name').text(check.attr('data-check'));
      popup.find('#peek-item').attr('data-check', check.attr('data-check')).attr('data-location', check.closest('.location').attr('data-location'));
    }.bind(this);

    this.recordPeek = function(e){
      var src = $(e.target).closest('.peek-item').find('img').attr('src');
      var form = $('#peek-item');
      var peekControls = $('.location[data-location='+form.attr('data-location')+']').find('.item-check[data-check="'+form.attr('data-check')+'"]').find('.peek-controls');
      peekControls.find('img').attr('src', src).show();
      peekControls.find('.unseen').hide();
      hidePopup();
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
      this.saveState();
      ItemChecks.forEach(function(check){
        var $elem = $('#' + toSlug(check.location) + '-' + toSlug(check.name)).closest('.item-check');
        if (check.available(this.inventory, this.currentAge())){
          $elem.removeClass('inaccessible');
        } else {
          $elem.addClass('inaccessible');
        }
        if (check.peekable(this.inventory, this.currentAge())){
          $elem.addClass('peekable');
        } else {
          $elem.removeClass('peekable');
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
          if ($(this).find('.item-check.peekable').length){
            $(this).addClass('peekable');
          } else {
            $(this).removeClass('peekable');
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
      dungeonItems[Age.ADULT] = ['LIGHT_MEDALLION','FOREST_MEDALLION','FIRE_MEDALLION','WATER_MEDALLION','SHADOW_MEDALLION','SPIRIT_MEDALLION'];

      if ((this.pedestalHints.length == 3 && this.currentAge() == Age.CHILD) || this.pedestalHints.length == 6 && this.currentAge() == Age.ADULT){
        for (var i = 0; i < this.pedestalHints.length; i++){
          $('.item[data-item=' + dungeonItems[this.currentAge()][i] + '] .subtitle').text(this.pedestalHints[i]);
        }
        if (this.currentAge() == Age.ADULT) this.labelStones();
        this.pedestalHints = [];
        hidePopup();
        $('.pedestal-hint').prop('disabled', false);
      }
    }.bind(this);

    this.spawnFor = function(age){
      return this.spawns[age];
    }.bind(this);

    this.setSpawn = function(e){
      e.preventDefault();
      var popup = $('#set-spawn-popup');
      popup.find('.current-age').text(this.currentAge());
      popup.find('.current-spawn').text(this.spawnFor(this.currentAge()))
      showPopup('#set-spawn-popup');
      return false;
    }.bind(this);

    this.recordSpawn = function(e){
      var button = $(e.target).closest('.spawn-location');
      this.spawns[this.currentAge()] = button.val();
      this.inventory.spawns[this.currentAge()] = button.val();
      this.refreshAccessible();
      hidePopup();
    }.bind(this);

    // begin state saving code
    this.saveState = function(){
      var key = window.location.hash || "";
      window.localStorage.setItem(
        key + "/inventory",
        this.inventory.items.map(x => x.key + (typeof x.count === 'number' ? ('='+x.count) : '')));
      window.localStorage.setItem(
        key + "/locations",
        $(".item-check.collected [type=checkbox]").toArray().map(x => x.id));
      window.localStorage.setItem(
        key + "/spawns",
        Object.keys(tracker.spawns).map(x => x + '=' + tracker.spawns[x]));
      // A bit gross, since some settings are dropdowns and others are checkboxes
      // and serializeArray only does the right thing on the former.
      // Saves dropdown settings as NAME=VALUE and checkbox settings as either
      // NAME or !NAME.
      window.localStorage.setItem(
        key + "/settings",
        $("#settings select").serializeArray().map(x => x.name + "=" + x.value)
          .concat($("#settings input[type=checkbox]").toArray().map(x => (x.checked ? "" : "!") + x.name)))
    }.bind(this);

    this.loadState = function(){
      var key = window.location.hash || "";
      var saved_items = (window.localStorage.getItem(key + "/inventory") || "")
        .split(",")
        .filter(x => !!x);
      var saved_locs = (window.localStorage.getItem(key + "/locations") || "")
        .split(",")
        .filter(x => !!x);
      var saved_spawns = (window.localStorage.getItem(key + "/spawns") || "")
        .split(",")
        .filter(x => !!x);
      var saved_settings = (window.localStorage.getItem(key + "/settings") || "")
        .split(",")
        .filter(x => !!x);
      this.initializeItemIconsFrom(saved_items);
      this.initializeLocationChecksFrom(saved_locs);
      this.initializeSpawnsFrom(saved_spawns);
      this.initializeSettingsFrom(saved_settings);
    }.bind(this);

    this.initializeItemIconsFrom = function(inv){
      console.log("Restoring saved items:", inv);
      for (var n in inv) {
        var item_id = inv[n];
        var item;
        if (item_id.indexOf('=') > -1) {
          // Saved item has an associated count
          item_id = item_id.split('=');
          item = Items[item_id[0]];
          // We subtract 1 here because when we do a simulated click on it it'll
          // add 1 to the count, ick.
          item.count = parseInt(item_id[1]-1);
        } else {
          item = Items[item_id];
        }
        var button = $('.item[data-original-item=' + item.basekey + ']');
        // This is super gross.
        // The item checkboxes don't use any sort of reactive UI, so to make
        // sure the display and data layers stay in sync we instead simulate
        // clicks on each one.
        button.click();
        while (button.hasClass("collected") && button[0].getAttribute("data-item") != item.key) {
          button.click();
        }
        if (!button.hasClass("collected")) {
          console.log("WARNING: restoring item " + item.key
            + ": I tried all possible settings of button " + item.basekey
            + " but none of them showed the right item; giving up.");
        }
      }
    }.bind(this);

    this.initializeLocationChecksFrom = function(locs){
      console.log("Restoring saved locations:", locs);
      for (var n in locs) {
        var loc = locs[n];
        $('#' + loc).click();
      }
    }.bind(this);

    this.initializeSpawnsFrom = function(spawns){
      console.log("Restoring saved spawns:", spawns);
      if (spawns.length){
        var spawns_obj = Object.fromEntries(spawns.map(x => x.split('=')));
        this.spawns = $.extend({}, spawns_obj);
        this.inventory.spawns = $.extend({}, spawns_obj);
      }
    }.bind(this);

    this.initializeSettingsFrom = function(sets){
      console.log("Restoring saved settings:", sets);
      for (var n in sets) {
        var setting = sets[n];
        if (setting.indexOf('=') > -1) {
          // Selector
          var kv = setting.split('=');
          $('#settings [name=' + kv[0] + ']')[0].value = kv[1];
        } else if (setting.indexOf('!') == 0) {
          // Unset checkbox.
          $('#settings [name=' + setting.substr(1) + ']')[0].checked = false;
        } else {
          // Set checkbox.
          $('#settings [name=' + setting + ']')[0].checked = true;
        }
      }
    }.bind(this);
    // end state saving code

    this.labelStones = function(){
      // put collected stones first
      $('.item.stone').sort(function(a, b){
        return Math.abs([
          ($(a).hasClass('collected') && !$(b).hasClass('collected')),
          (($(a).hasClass('collected') && $(b).hasClass('collected')) || (!$(a).hasClass('collected') && !$(b).hasClass('collected'))),
          (!$(a).hasClass('collected') && $(b).hasClass('collected'))
        ].indexOf(true)) - 1;
      }).each(function(i, elem){
        if (!$(elem).find('.subtitle').text()){
          $(elem).find('.subtitle').text($('.pedestal-hint:not(:disabled)')[i].value)
        }
      });
    }.bind(this);

    this.init = function(){
      this.inventory = new Inventory([], {
        [Age.CHILD]: Locations.KOKIRI_FOREST,
        [Age.ADULT]: Locations.TEMPLE_OF_TIME
      });
      this.settings = {};
      this.spawns = {
        [Age.CHILD]: Locations.KOKIRI_FOREST,
        [Age.ADULT]: Locations.TEMPLE_OF_TIME
      };
      $('.item').click(this.collect);
      $('.item').contextmenu(this.uncollect);
      $('.item-check [type="checkbox"]').on('change', this.check);
      this.loadState();
      $('.peek-controls').click(this.peek);
      $('.peek-item').click(this.recordPeek);
      $('#age-selector input').on('change', this.refreshAccessible);
      $('#age-selector').on('change', this.changeAge);
      $('#settings input, #settings select').on('change', this.applySettings);
      $('#check-pedestal').submit(this.checkPedestal);
      $('#read-pedestal .pedestal-hint').click(this.recordPedestalHint);
      $('#set-spawn').submit(this.setSpawn);
      $('#set-spawn-choose-location .spawn-location').click(this.recordSpawn);

      this.applySettings();
    }.bind(this);
  };

  $(function(){
    generateKey();
    setupPopups();
    generateLocationList($('#locations .locations'), Regions);
    generateSpawnList($('#set-spawn-choose-location'));
    generateChecklist(ItemChecks);
    generateSettingsList($('#settings table'), Settings);
    window.checks = ItemChecks;
    window.tracker = new ItemTracker();
    window.tracker.init();
  });
});
