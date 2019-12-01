const express = require("express");
const router = express.Router();

//controller
const { read, update } = require("../controllers/user");
const { requireSignin, admin } = require("../controllers/auth")

router.get("/user/:id", requireSignin, read);
router.put("/user/update", requireSignin, update);
router.put("/admin/update", requireSignin, admin, update);

module.exports = router;
