/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": null,
    "passwordAuth": {
      "enabled": true,
      "identityFields": [
        "email"
      ]
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": "",
    "passwordAuth": {
      "enabled": false,
      "identityFields": []
    }
  }, collection)

  return app.save(collection)
})
