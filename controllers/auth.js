const User = require("../models/user");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// exports.signup = (req,res) => {
//    //console.log(req.body);
//    const {name, email, password} = req.body;
//    User.findOne({email}).exec((err, user) => {
//        if(user){
//            return res.status(400).json({
//                error: 'Email is taken already'
//            })
//        }
//    })

//    let newUser = new User({name, email, password})
//    newUser.save((err, success) => {
//        if(err){
//            console.log('Signup error: ',err);
//            return res.status(400).json({
//                error: err
//            })
//        }
//        res.json({
//            message: 'Signup success! Please signin'
//        })
//    })
// }

exports.signup = (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email }).exec((err, user) => {
    if (user) {
      return res.status(400).json({
        error: "Email is taken already"
      });
    }
    const token = jwt.sign(
      { name, email, password },
      process.env.JWT_ACCOUNT_ACTIVATION,
      {
        expiresIn: "10m"
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Account activation link`,
      html: `
            <h3>Please use the following link to activate your account</h3>
            <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
            <hr/>
            <p>This email may contain sensitive information</p>
            <p>${process.env.CLIENT_URL}</p>
        
        `
    };
    sgMail
      .send(emailData)
      .then(sent => {
        console.log("Signup email sent", sent);
        return res.json({
          message: `Email has been sent to ${email}. Follow the instructions to activate your account`
        });
      })
      .catch(err => {
        //console.log('Signup email sent error',err)
        return res.json({
          message: err.message
        });
      });
  });
};

exports.activation = (req, res) => {
  const { token } = req.body;

  if (token) {
    jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, (err, decoded) => {
      if (err) {
        console.log("JWT VERIFY IN ACCOUNT ACTIVATION ERROR", err);
        return res.status(401).json({
          error: "Expired link. Please sign up again"
        });
      }
      const { name, email, password } = jwt.decode(token);

      const user = new User({ name, email, password });

      user.save((err, user) => {
        if (err) {
          console.log("Save user in account activation error", err);
          return res.status(401).json({
            error: "Error saving user. Try signup again"
          });
        }
        return res.json({
          message: "Your account has been successfully activated. Please sign in"
        });
      });
    });
  } else {
    return res.json({
      message: "Something went wrong. Try again"
    });
  }
};

exports.signin = (req, res) => {
  const { email, password } = req.body;

  //check if user exist
  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User with that email does not exist. Please signup"
      });
    }
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: "Email and password do not match"
      });
    }
    //generate a token and send to client
    const token = jwt.sign(
      { _id: user._id }, 
      process.env.JWT_SECRET, {
      expiresIn: "7d"
    });
    const {_id, name, email, role} = user;

    return res.json({
      token,
      user: {_id, name, email, role}
    })
  });
};
