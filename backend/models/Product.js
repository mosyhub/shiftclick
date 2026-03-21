const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'] },
    price: { type: Number, required: [true, 'Price is required'], min: 0 },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Mouse', 'Keyboard', 'Gaming Chair', 'Headset', 'Monitor', 'Controller', 'RGB & Accessories'],
    },
    brand: { type: String, required: [true, 'Brand is required'], trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String },
      },
    ],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    specs: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

productSchema.virtual('discountedPrice').get(function () {
  if (this.discount > 0) return +(this.price * (1 - this.discount / 100)).toFixed(2);
  return this.price;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);