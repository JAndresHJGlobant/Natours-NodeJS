import mongoose, { Aggregate, Document, Query } from 'mongoose';
import slugify from 'slugify';
import validator from 'validator';

interface TourAttrs {
  name: string;
  duration: number;
  maxGroupSize: number;
  difficulty: string;
  ratingsAverage?: number;
  ratingsQuantity?: number;
  price: number;
  priceDiscount: number;
  summary: string;
  description?: string;
  imageCover: string;
  images: string[];
  createdAt: Date;
  startDates: Date[];
  slug: string;
  secretTour: boolean;
}

// An interface that describes the properties
// that a User Document has
interface TourDoc extends TourAttrs, Document {
  durationWeeks?: string;
  start: Date;
}

const toursSchema = new mongoose.Schema<TourAttrs>(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      //validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Raiting must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      // custom validator, it should return a boolean to know if there's an error
      validate: {
        validator: function (this: TourDoc, priceDiscount: number) {
          // This kind of validators can only be user when creating
          // new documents, not when an update is happening.
          return priceDiscount < this.price;
        },
        message: 'Discount price ({VALUE}) should be below the regular price.',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    slug: String,
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

/**
 * Virtual properties can be useful to create properties
 * derived from the fields i.e convert Miles to Kilometers
 * This properties are not going to be persisted on the DB
 * so we cannot make queries with this virtual field.
 */
toursSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

/**
 * Document Middleware: "pre" and "post" hooks operations. Functions
 * that run before or after certain event, like saving
 * a document to the DB.
 */

// RUNS before the .save() and .create() but not on .insertMany()
toursSchema.pre('save', function (next) {
  console.log(this);
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Has access to the Doc that was save to the DB
// Always call the next function.
toursSchema.post('save', function (doc, next) {
  console.log('Post save hook for Doc: ', doc);
  next();
});

// QUERY Middleware: Allows to run functions before or after
// a certain query is executed.
// Use case: Hide some tours that could be exclusive
toursSchema.pre<Query<TourAttrs, TourDoc>>(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

// After query execution
toursSchema.post<Query<TourAttrs, TourDoc>>(/^find/, function (docs, next) {
  //console.log(docs);

  next();
});

// AGGREGATION Middleware: Allows to add hooks before or
// after an agreggation happens.
toursSchema.pre<Aggregate<TourDoc>>('aggregate', function (next) {
  this.pipeline().unshift({
    $match: { secretTour: { $ne: true } },
  });

  next();
});

const Tour = mongoose.model<TourDoc>('Tour', toursSchema);

export default Tour;
