const User = require("../models/user");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const _ = require("lodash");
const { OAuth2Client } = require("google-auth-library");
const fetch = require('node-fetch')

//sendgrid
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
          message:
            "Your account has been successfully activated. Please sign in"
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
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });
    const { _id, name, email, role } = user;

    return res.json({
      token,
      user: { _id, name, email, role }
    });
  });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET //makes the data available in the req.user
});

exports.admin = (req, res, next) => {
  User.findById({ _id: req.user._id }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found"
      });
    }
    if (user.role !== "admin") {
      return res.status(400).json({
        error: "Admin resource. Access denied"
      });
    }

    req.profile = user;
    next();
  });
};

exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User with that email does not exist"
      });
    }
    const token = jwt.sign(
      { _id: user._id, name: user.name },
      process.env.JWT_RESET_PASSWORD,
      {
        expiresIn: "10m"
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Reset password ink`,
      html: `
              <h3>Please use the following link to reset your password</h3>
              <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
              <hr/>
              <p>This email may contain sensitive information</p>
              <p>${process.env.CLIENT_URL}</p>
          
          `
    };
    return user.updateOne({ resetPasswordLink: token }, (err, success) => {
      if (err) {
        return res.status(400).json({
          error: "Database connection error on user password forgot request"
        });
      } else {
        sgMail
          .send(emailData)
          .then(sent => {
            console.log("Signup email sent", sent);
            return res.json({
              message: `Email has been sent to ${email}. Follow the instructions to reset your password`
            });
          })
          .catch(err => {
            //console.log('Signup email sent error',err)
            return res.json({
              message: err.message
            });
          });
      }
    });
  });
};

exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  if (resetPasswordLink) {
    jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD,
      (err, decoded) => {
        if (err) {
          return res.status(400).json({
            error: "Expired Link. Try again"
          });
        }

        User.findOne({ resetPasswordLink }, (err, user) => {
          if (err || !user) {
            return res.status(400).json({
              error: "Something went wrong. Try later"
            });
          }
          const updatedFields = {
            password: newPassword,
            resetPasswordLink: ""
          };

          user = _.extend(user, updatedFields);

          user.save((err, result) => {
            if (err) {
              return res.status(400).json({
                error: "Error resetting the user password"
              });
            }

            res.json({
              message: "Ypu can now login with your new password."
            });
          });
        });
      }
    );
  }
};

const client = new OAuth2Client(process.env.GOOLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
  const { idToken } = req.body;

  client
    .verifyIdToken({ idToken, audience: process.env.GOOLE_CLIENT_ID })
    .then(response => {
      //console.log('GOOGLE LOGIN RESPONSE',response)
      const {email_verified, name, email} = response.payload
      if(email_verified){
        User.findOne({email}).exec((err, user) => {
          if(user){
            const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
            const {_id, email, name, role} = user
            return res.json({
              token, user: {_id, email, name, role}
            })
          } else {
            let password = email + process.env.JWT_SECRET
            user = new User({name, email, password})
            user.save((err, data) => {
              if(err){
                console.log('ERROR GOOGLE', err)
                return res.status(400).json({
                  error: 'User signup failed with google'
                })
              }
              const token = jwt.sign({_id: data._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
              const {_id, email, name, role} = data
              return res.json({
                token, user: {_id, email, name, role}
              })
            })
          }
        })
      } else {
        return res.status(400).json({
          error: 'Google login failed. Try again'
        })
      }
    });
};

exports.facebookLogin = (req, res) => {
  const {userID, accessToken} = req.body;

  const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`

  return (
    fetch(url, {
      method: 'GET'
    })
    .then(response => response.json())
    .then(response => {
      const {email, name} = response
      User.findOne({email}).exec((err, user) => {
        if(user){
          const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
            const {_id, email, name, role} = user
            return res.json({
              token, user: {_id, email, name, role}
            })
        } else {
          let password = email + process.env.JWT_SECRET
            user = new User({name, email, password})
            user.save((err, data) => {
              if(err){
                console.log('ERROR FACEBOOK', err)
                return res.status(400).json({
                  error: 'User signup failed with facebook'
                })
              }
              const token = jwt.sign({_id: data._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
              const {_id, email, name, role} = data
              return res.json({
                token, user: {_id, email, name, role}
              })
            })
        }
      })
    })
    .catch(error => {
      res.json({
        error: 'Facebook login failed, Try again later'
      })
    })
  )
}
