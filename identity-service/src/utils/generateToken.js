const logger = require("./logger");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");

const generateToken = async (user) => {
  try {
    const accessToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m",
      }
    );
    const refreshToken = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error(error);
    throw new Error("Internal Server Error");
  }
};

module.exports = generateToken;
