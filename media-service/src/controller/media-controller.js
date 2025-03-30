const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");
const Media = require("../models/Media");

const uploadMedia = async (req, res) => {
  logger.info("Starting uploading media to Cloudinary");

  try {
    console.log("req.file", req.file);
    if (!req.file) {
      logger.error(
        "No file found in request. Please add a file and try again!"
      );
      return res.status(400).send({
        success: false,
        message: "No file found in request. Please add a file and try again!",
      });
    }

    const { originalname: originalName, mimetype: mimeType, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`File details: name=${originalName}, type=${mimeType}`);

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload result: ${cloudinaryUploadResult.public_id}`
    );
    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName,
      mimeType,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    logger.info("Media uploaded successfully");
    res.status(201).send({
      success: true,
      message: "Media uploaded successfully",
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
    });
  } catch (error) {
    logger.error("Error while uploading media to Cloudinary", error);
    res.status(500).send("Internal Server Error");
  }
};

const getAllMedias = async (req, res) => {
  try {
    const result = await Media.find();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error("Error while fetching media", error);
    res
      .status(500)
      .json({ success: false, message: "Error while fetching media" });
  }
};

module.exports = {
  uploadMedia,
  getAllMedias
};
