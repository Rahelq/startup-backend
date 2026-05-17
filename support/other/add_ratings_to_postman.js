const fs = require("fs");
const path = require("path");

const collectionPath = path.join(__dirname, "./StartupConnect Backend API.postman_collection.json");
const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

const ratingsFolder = {
  name: "Ratings",
  item: [
    {
      name: "Create Rating",
      request: {
        method: "POST",
        header: [
          { key: "Authorization", value: "Bearer {{startupToken}}" },
          { key: "Content-Type", value: "application/json" },
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify(
            {
              entity_type: "mentor",
              entity_id: 1,
              reviewed_user_id: 2,
              rating: 5,
              review: "Great session",
            },
            null,
            2
          ),
        },
        url: "http://localhost:3000/api/ratings",
      },
    },
    {
      name: "List Ratings for Entity",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{startupToken}}" }],
        url: "http://localhost:3000/api/ratings/{{entityType}}/{{entityId}}",
      },
    },
    {
      name: "Report Rating",
      request: {
        method: "POST",
        header: [
          { key: "Authorization", value: "Bearer {{startupToken}}" },
          { key: "Content-Type", value: "application/json" },
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({ reason: "abuse", description: "Spam" }, null, 2),
        },
        url: "http://localhost:3000/api/ratings/{{ratingId}}/report",
      },
    },
  ],
};

const adminFolder = {
  name: "Admin - Ratings",
  item: [
    {
      name: "List Moderation Queue",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
        url: "http://localhost:3000/api/admin/ratings",
      },
    },
    {
      name: "Hide Rating",
      request: {
        method: "PUT",
        header: [
          { key: "Authorization", value: "Bearer {{adminToken}}" },
          { key: "Content-Type", value: "application/json" },
        ],
        body: { mode: "raw", raw: JSON.stringify({ reason: "policy" }, null, 2) },
        url: "http://localhost:3000/api/admin/ratings/{{ratingId}}/hide",
      },
    },
  ],
};

collection.item.push(ratingsFolder);
collection.item.push(adminFolder);

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log("Postman collection updated:", collectionPath);
