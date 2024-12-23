require("dotenv").config();
const multer = require("multer");
const {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const multerS3 = require("multer-s3");
const sharp = require("sharp");
const axios = require("axios");

const s3 = new S3Client({
  region: process.env.REGION_S3,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID_S3,
    secretAccessKey: process.env.ACCESS_SECRET_KEY_S3,
  },
});
const deleteSingle = async (bucket, key) => {
  let result = {
    success: false,
    message: "",
  };
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await s3.send(command);
    result.success = true;
    result.message = "Berhasil dihapus";
    return result;
  } catch (e) {
    result.message = "Gagal dihapus";
    return result;
  }
};
const deleteMultiple = async (bucket, objects) => {
  //objects [{Key: 'folder/key.ext'}]
  let result = {
    deleted: 0,
    data: [],
    success: false,
    message: "",
  };
  try {
    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: objects,
      },
    });
    const { Deleted } = await s3.send(command);
    result.deleted = Deleted.length;
    result.data = Deleted.map((item) => item.Key);
    result.success = true;
    result.message = "Berhasil dihapus";
    return result;
  } catch (e) {
    result.message = "Gagal dihapus";
    return result;
  }
};

const convertToWebp = async (location, key, bucket) => {
  let result = {
    location: "",
    success: false,
    error: false,
  };
  try {
    const response = await axios({
      method: "get",
      url: location,
      responseType: "stream",
    });
    const webp = response.data.pipe(sharp().webp({ quality: 60 }));
    const params = {
      Key: key + ".webp",
      Bucket: bucket,
      Body: webp,
      ContentType: "image/webp",
      ACL: "public-read",
    };
    const parallelUploads3 = new Upload({
      client: s3,
      params,
    });
    parallelUploads3.on("httpUploadProgress", (progress) => {});
    await parallelUploads3.done();
    result.location = parallelUploads3.singleUploadResult.Location;
    result.success = true;
    return result;
  } catch (e) {
    result.error = true;
    return result;
  }
};

const getExtension = (original_name) => {
  return original_name.split(".")[1];
};

const uploadFile = multer({
  // limits: { fieldSize: 25 * 1024 * 1024 },
  storage: multerS3({
    s3: s3,
    bucket: process.env.BUCKET,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, done) => {
      done(null, { fieldName: file.fieldname });
    },
    key: (req, file, done) => {
      done(
        null,
        `${process.env.FOLDER}/att_${Date.now()}.${getExtension(
          file.originalname
        )}`
      );
    },
  }),
});

module.exports = {
  s3,
  deleteSingle,
  deleteMultiple,
  convertToWebp,
  uploadFile,
};
