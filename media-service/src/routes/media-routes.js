const { uploadMedia, getAllMedias } = require("../controller/media-controller");
const authenticateRequest = require("../middleware/authMiddleware");
const express = require("express");
const logger = require("../utils/logger");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Error while uploading file", err);
        return res.status(400).send({
          error: err.message,
          stack: err.stack,
          message: "Error while uploading file",
        });
      } else if (err) {
        logger.error("Unknown Error occured while uploading file", err);
        return res.status(500).send({
          error: err.message,
          stack: err.stack,
          message: "Unknown Error occured while uploading file",
        });
      }
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file found in request. Please add a file and try again!",
          error: err.message,
          stack: err.stack,
        });
      }

      next();
    });
  },
  uploadMedia
);

router.get("/", authenticateRequest, getAllMedias);

module.exports = router;
