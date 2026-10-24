/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1225211849")

  // update field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "select3332386121",
    "maxSelect": 1,
    "name": "minigameType",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "programmer",
      "builder",
      "medic"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1225211849")

  // update field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "select3332386121",
    "maxSelect": 1,
    "name": "minigameType",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "programmer, builder, medic"
    ]
  }))

  return app.save(collection)
})
