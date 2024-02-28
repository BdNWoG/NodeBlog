const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect('mongodb://localhost/myBlogApp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'very secret key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost/myBlogApp' })
}));

app.set('view engine', 'ejs');

// User model
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Post model
const PostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});
const Post = mongoose.model('Post', PostSchema);

// Routes
app.get('/', (req, res) => {
    Post.find().populate('author').exec((err, posts) => {
        if (err) throw err;
        res.render('index', { posts: posts });
    });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await User.create({ username, password: hashedPassword });
        res.redirect('/login');
    } catch (error) {
        res.redirect('/register');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.get('/post', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('post');
});

app.post('/post', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    const { title, content } = req.body;
    await Post.create({
        title,
        content,
        author: req.session.userId
    });
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
