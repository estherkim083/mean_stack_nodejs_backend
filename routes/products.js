const { Product } = require("../models/product");
const { Category } = require("../models/category");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpeg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error("Invalid image type");
    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, path.join(__dirname, "../public/uploads/"));
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname
      .replace(" ", "-")
      .replace(".jpg", "")
      .replace(".png", "")
      .replace(".jpeg", "");
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, fileName + "-" + Date.now() + "." + extension);
  },
});

const uploadOptions = multer({ storage: storage });
// http://localhost:3000/api/v1/products
router.post("/", uploadOptions.single("image"), async (req, res) => {
  console.log(req.body.category);
  const category = await Category.findById(req.body.category);
  if (!category) {
    return res.status(400).send("Invalid Category");
  }
  const file = req.file;
  if (!file) {
    return res.status(400).send("No image in the request");
  }
  const fileName = file.filename;

  const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
  let product = new Product({
    name: req.body.name,
    image: `${basePath}${fileName}`,
    countInStock: req.body.countInStock,
    description: req.body.description,
    richDescription: req.body.richDescription,
    brand: req.body.brand,
    price: req.body.price,
    category: req.body.category,
    rating: req.body.rating,
    numReviews: req.body.numReviews,
    isFeatured: req.body.isFeatured,
  });
  product = await product.save();
  if (!product) {
    return res.status(500).send("the product cannot be created");
  }
  return res.status(200).send(product);
});

router.get("/", async (req, res) => {
  let filter = {};
  console.log(req.query.categories);
  if (req.query.categories) {
    console.log("query");
    filter = { category: req.query.categories.split(",") };
  }
  //localhost:3000/api/v1/products?categories=23423423,23423
  const productList = await Product.find(filter).populate("category");

  if (!productList) {
    res.status(500).json({ success: false });
  }
  res.send(productList);
});

router.get("/:id", async (req, res) => {
  const productList = await Product.findById(req.params.id).populate(
    "category"
  );

  if (!productList) {
    res.status(500).json({ success: false });
  }
  res.send(productList);
});

router.put("/:id", uploadOptions.single("image"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).send("Invalid product id");
  }
  const category = await Category.findById(req.body.category);
  if (!category) {
    return res.status(400).send("Invalid Category");
  }
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(400).send("Invalid Product");
  }
  const file = req.file;
  let imagepath;

  if (file) {
    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
    imagepath = `${basePath}${fileName}`;
  } else {
    imagepath = product.image;
  }
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      image: imagepath,
      countInStock: req.body.countInStock,
      description: req.body.description,
      richDescription: req.body.richDescription,
      brand: req.body.brand,
      price: req.body.price,
      category: req.body.category,
      rating: req.body.rating,
      numReviews: req.body.numReviews,
      isFeatured: req.body.isFeatured,
    },
    { new: true }
  );
  if (!updatedProduct) {
    return res.status(404).json({ message: "product could not be updated" });
  }
  res.status(200).send(updatedProduct);
});
router.delete("/:id", (req, res) => {
  Product.findByIdAndRemove(req.params.id)
    .then((product) => {
      if (product) {
        return res
          .status(200)
          .json({ success: true, message: "the product is deleted" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "product not found" });
      }
    })
    .catch((err) => {
      return res.status(400).json({ sucess: false, error: err.message });
    });
});

router.get("/get/count", async (req, res) => {
  const productCount = await Product.countDocuments();

  if (!productCount) {
    res.status(500).json({ success: false });
  }
  res.send({
    productCount: productCount,
  });
});

router.get("/get/featured/:count", async (req, res) => {
  const count = req.params.count ? req.params.count : 0;
  const products = await Product.find({
    isFeatured: true,
  }).limit(+count);

  if (!products) {
    res.status(500).json({ success: false });
  }
  res.send(products);
});

router.put(
  "/gallery-images/:id",
  uploadOptions.array("images", 10),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send("Invalid product id");
    }
    const files = req.files;
    let imagePaths = [];
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
    if (files) {
      files.map((file) => {
        imagePaths.push(`${basePath}${file.filename}`);
      });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagePaths,
      },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: "product could not be updated" });
    }
    res.status(200).send(product);
  }
);

module.exports = router;
