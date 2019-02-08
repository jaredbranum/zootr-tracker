define(["data/ages", "data/itemsAndSongs"], function(Age, Items){
  return function ItemCheck(name, location, requirementSets, extra){
    // the combination of name and location should be unique.
    // i.e. you can have 2 checks named "Map Chest", but not
    // in the same location
    this.name = name;
    this.location = location;
    this.requirements = requirementSets || [{}];
    this.extra = extra || {};
    this.preset = this.extra.preset;
    this.visible = this.extra.visible || {peek: false};

    this.available = function(inventory, age, requirements){
      var req;
      requirements = requirements || this.requirements;
      if (!inventory.hasAccessTo(this.location)) return false;
      for (var i = 0; i < requirements.length; i++){
        req = requirements[i];
        if (req.items && !inventory.hasActiveItems(req.items))
          continue;
        if (req.abilities && !inventory.hasAbilities(req.abilities))
          continue;
        if (req.locations && !inventory.hasAccessTo(req.locations))
          continue;
        if (req.age && req.age != Age.ANY && req.age != age)
          continue;
        if (req.offLogic && inventory.settings.RULES == 'LOGIC_ONLY')
          continue;
        if (req.glitches && inventory.settings.RULES != 'NO_MAJOR_GLITCHES')
          continue;
        if (req.settings && !inventory.hasSettings(req.settings))
          continue;
        if (req.checks && !inventory.hasChecks(req.checks))
          continue;
        if (req.itemCounts && !inventory.hasCountOfItems(req.itemCounts))
          continue;
        return true;
      }
      return false;
    }.bind(this);

    this.peekable = function(inventory, age){
      if (this.visible.peek){
        return this.available(inventory, age, this.visible.requirements);
      }
      return false;
    }.bind(this);

    this.presetItem = function(inventory){
      if (!this.preset) return null;
      if (this.preset.item){
        if (this.preset.settings && !inventory.hasSettings(this.preset.settings))
          return null;
        return this.preset.item;
      }
      return null;
    }.bind(this);
  };
});
