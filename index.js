
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
require('./db/database');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const oAuth2Strategy = require('passport-google-oauth20').Strategy;
const app = express();
const PORT = process.env.PORT || 5000;
const ClientId = process.env.client_id;
const ClientSecret = process.env.client_secret;
const cookieParser = require('cookie-parser')
const userDb = require('./Model/schema')



// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser())

//setup session
app.use(session({
  secret: "dfhdshdfjklas12323kdf7789",
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE,
  }),
}));

//setup passport
app.use(passport.initialize())
app.use(passport.session())

passport.use(
  new oAuth2Strategy({
    clientID: ClientId,
    clientSecret: ClientSecret,
    callbackURL: "https://musify-server-three.vercel.app/auth/google/callback",
    scope: ["profile", "email"]
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await userDb.findOne({
        googleId: profile.id
      });
      if (!user) {
        user = new userDb({
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile?.emails[0]?.value,
          image: profile?.photos[0]?.value
        });
        await user.save();
      }
      return done(null, user)
    } catch (error) {
      return done(error, null)

    }
  })
)

passport.serializeUser((user, done) => {
  done(null, user)
})
passport.deserializeUser((user, done) => {
  done(null, user)
})


// initial google ouath login
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback", passport.authenticate("google", {
  successRedirect: "http://localhost:5173/home",
  failureRedirect: "http://localhost:5173"
}))


//Traditional Signup
app.post('/signup', async (req, res) => {
  console.log('Request Body:', req.body);
  const { name, email, password } = req.body;
  try {
    const existingUser = await userDb.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists!" });
    }
    const newUser = new userDb({
      name,
      email,
      password,
    });
    await newUser.save();
    req.login(newUser, (err) => {
      console.log(newUser);

      if (err) return res.status(500).json({ message: "Signup failed" });
      return res.status(201).json({ message: "Signup successful", user: newUser });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

//Traditional Login
app.post('/login', async (req, res) => {
  console.log('Request login:', req.body);
  const { email, password } = req.body;
  try {
    const user = await userDb.findOne({ email })
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      res.cookie("sessionSecret", "dfhdshdfjklas12323kdf7789", {
        httpOnly: true, // Ensures the cookie is not accessible via JavaScript (to mitigate XSS)
        secure: false,  // Set to true if using HTTPS in production
        maxAge: 24 * 60 * 60 * 1000, // Cookie expiration time (e.g., 1 day)
      });
      return res.status(200).json({ message: "Login successful", user });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
})

app.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) { return next(err) }
    res.redirect("http://localhost:5173");
  })
})

app.get('/login/success', (req, res) => {
  if (req.user) {
    res.status(200).json({ message: "User successfully logged in", user: req.user });
  } else {
    res.status(401).json({ message: "Not Authorized" });
  }
});



app.listen(PORT, () => {
  console.log(`server is running ${PORT}`);
});
