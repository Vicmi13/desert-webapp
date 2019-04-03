const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a name',
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: {
        type: [String]
    },
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'Supply a coordinates'
        }],
        address: {
            type: String,
            required: 'Supply an address'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
}, {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    });

//Indexes
storeSchema.index({
    name: 'text',
    description: 'text'
});

//storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function (next) {
    if (!this.isModified('name')) {
        next();
        return;
    }
    this.slug = slug(this.name);
    //find other store similar name
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    console.log('slugRegEx: ', slugRegEx);
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
    if (storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }
    next();
});

storeSchema.statics.getTagsList = function () {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
};

storeSchema.statics.getTopStores = function () {
    return this.aggregate([
         //Lookup stores and populate their reviews
         { $lookup: {
                from: 'reviews', localField: '_id', //add an s automatically in the end to the model -> review
                foreignField: 'store', as: 'reviews' //as: is the name showed in the response of the data
            }
        },
        //filter for only items that have 2 or more reviews
        { $match : {
                'reviews.1': { $exists: true}
            }
        },
        //add the average reviews field
        {
            $project: {
                photo: '$$ROOT.photo', //$$ROOT -> original document
                name: '$$ROOT.name',
                reviews: '$$ROOT.reviews',
                slug: '$$ROOT.slug',
                averageRating: { $avg: '$reviews.rating'}
            }
        },
        //sort it by our new field, highest reviews first
        {
            $sort : { averageRating: -1 },
            
        }, {
            $limit: 10
        }
    ]);
};

storeSchema.virtual('reviews', {
    ref: 'Review', //what model to Link ?   
    localField: '_id',   //which field on the store ?
    foreignField: 'store'   //which field on the review ?
});

function autopopulate(next){
    this.populate('reviews');
    next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);