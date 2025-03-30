const Post = require("../models/Post");
const { publishEvent } = require("../utils/rabbitmq");
const { validateCreatePost } = require("../utils/validation");
const logger = require("./../utils/logger");

async function invalidatePostCache(req, input) {
  const cacheKey = `post:${input}`;
  await req.redisClient.del(cacheKey);

  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info("Create post endpoint hit...");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();
    invalidatePostCache(req, newlyCreatedPost._id.toString());
    logger.info(`Post created successfully: ${newlyCreatedPost}`);
    res.status(201).send({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    logger.error(`Error creating post: ${error.message}`);
    res.status(500).send({
      success: false,
      message: "Error creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const totalNoOfPosts = await Post.countDocuments();

    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    logger.error(`Error fetching post: ${error.message}`);
    res.status(500).send({
      success: false,
      message: "Error fetching post",
    });
  }
};

const getPost = async (req, res) => {
  try {
    logger.info("Get post endpoint hit...");
    const postId = req.params.id;
    console.log(postId);
    const cacheKey = `post:$${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    const singlePostDetailsById = await Post.findById(postId);
    console.log("singlePostDetailsById", singlePostDetailsById);
    if (!singlePostDetailsById) {
      return res.status(404).send({
        success: false,
        message: "Post not found",
      });
    }
    await req.redisClient.setex(
      cacheKey,
      300,
      JSON.stringify(singlePostDetailsById)
    );
    res.json(singlePostDetailsById);
  } catch (error) {
    logger.error(`Error fetching post: ${error.message}`);
    res.status(500).send({
      success: false,
      message: "Error fetching post",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    logger.info("Delete post endpoint hit...");
    const postId = req.params.id;
    const post = await Post.findByIdAndDelete({
      _id: postId,
      user: req.user.userId,
    });
    if (!post) {
      return res.status(404).send({
        success: false,
        message: "Post not found",
      });
    }
    // PUBLISH POST DELETE METHOD
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, postId);
    logger.info(`Post deleted successfully: ${post}`);
    res.send({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting post: ${error.message}`);
    res.status(500).send({
      success: false,
      message: "Error deleting post",
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
};
