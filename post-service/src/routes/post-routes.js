const express = require("express");
const {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
} = require("../controller/post-controller");
const authenticateRequest = require("../middleware/authMiddleware");

const router = express.Router();
//middleware -> auth middleware
router.use(authenticateRequest);

router.post("/create-post", createPost);
router.get("/", getAllPosts);
router.get("/:id", getPost);
router.delete("/:id", deletePost);

module.exports = router;
