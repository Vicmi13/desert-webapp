const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.uploadPhoto = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  //check if there is no new file to resize
  if (!req.file) {
    next();
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize (800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
}

exports.homePage = (req, res) => {
  console.log('Name: ', req.name);
  const vic = {
    name: 'Vic',
    lastName: 'Torres',
    job: 'Software Engineer',
    worker: true
  }
  //res.json(vic);
  res.render('hello', {
    name: 'Victor',
    dog: req.query.dog
  });

}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' })
}

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = new Store(req.body);
  console.log('store to save-> ', store)
  await store.save();
  req.flash('success', `Successfully created ${store.name}`);
  res.redirect('/');
  /*.then( store => {
    return Store.find();
  })
  .then( stores => {
    res.render('storeList', { stores: stores })
  })
  .catch(err => {
    throw Error(err);
  });*/
}

exports.getStores = async (req, res) => {
  const page  = req.params.page || 1;
  const limit  = 4;
  const skip = (page * limit) - limit;

  const storesPromise =  Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' }).exec();
  
  const countPromise = Store.count();
  const [stores, count] = await Promise.all([ storesPromise, countPromise]);
  const pages = Math.ceil( count / limit); 
  if(!stores.length && skip ) {
    req.flash('info', `You asked for page ${page}. But that doesn't exist`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }

  res.render('stores', { title: 'Stores',  stores, page, pages, count });
}

const confirmOwner = (store, user) => {
  if( !store.author.equals(user._id) ){
      throw Error('You must own a store in order to edit');
  }
}  

exports.editScore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id }).exec();
  confirmOwner(store, req.user);
  res.render('editStore', { title: `Edit ${store.name}`, store });
}

exports.updateStore = async (req, res) => {
  req.body.location.type = 'Point';
  const store = await Store.findOneAndUpdate(
    { _id: req.params },
    req.body,
    { new: true, runValidators: true }
  ).exec();
  req.flash('success', `Successfully updated <Strong>${store.name}</Strong>.
    <a href="stores/${store.slug}"> View Store →</a>`);
  res.redirect(`/stores/${store._id}/edit`);
}

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({slug: req.params.slug}).
    populate('author reviews');
  if(!store) return next();
  res.render('store', {store, title: store.name });
}

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQUery = tag || { $exists: true };
    const tagsPromise =  Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQUery });
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
    res.render('tags', { tags, title: 'Tags', tag, stores });
}

exports.searchStores = async (req, res) => {
  const stores = await Store.find(
    {
      $text : { $search: req.query.q }
    },{
      score:{ $meta: 'textScore' }
    }).sort({
      score:{ $meta: 'textScore' }
    }).limit(5);
  
  res.json(stores);
}


exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  console.log('coordinates' + coordinates);
  const q = {
    location: {
      $near: {
       $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 //meters
      }
    }
  };

  const stores = await Store.find(q).select('slug name description location photo').limit(10);
  console.log('near stores: ', stores );
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', {title: 'Map' });
};


exports.heartStore = async (req, res) => {
  const hearts  = req.user.hearts.map(obj => obj.toString() );
    const operator = hearts.includes(req.params.id ? '$pull' : '$addToSet');
    const user = await User
    .findByIdAndUpdate( req.user._id,
      { [operator] : {hearts : req.params.id }},
      {new : true}
    );
    res.json(user);
};


exports.getHearts = async (req, res) =>{
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });
  res.render('stores', {title: 'Hearted Stores', stores });
};


exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', {stores, title: ' Top Stores! ' });
};