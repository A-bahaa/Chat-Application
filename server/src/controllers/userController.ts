import User from '../models/userModel';
// import mongoose, { Document, Schema  } from 'mongoose';
const bcrypt = require('bcrypt');
import { Request, Response, NextFunction } from 'express';
const crypto = require("crypto");
import sendEmail from '../config/sendEmail'
import mongoose from 'mongoose';
import console from 'console';
// const jwt = require('jsonwebtoken');

// const accessToken = (id : any) => {
//     return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
//       expiresIn: '20m' 
//     });
//   };
//   const refreshToken = (id : any) => {
//       return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
//         expiresIn: '1h' // 1d
//       });
//     };
    

    
    const readUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;
            const user = await User.findOne({ username });
            if (!user) return res.json({ msg: 'Incorrect Username or Password', status: false });
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) return res.json({ msg: 'Incorrect Username or Password', status: false });
            delete user.password;
            
            const obj = JSON.stringify(user);
           
            const jsonData = JSON.parse(obj);
           
            const data = {'_id' : jsonData._id , 'username' : jsonData.username , 'isAvatarImageSet' : jsonData.isAvatarImageSet , 'avatarImage' : jsonData.avatarImage}
            
            return res.json({ status: true, user : data  }); //, token : 'secretTokenForAuthentication'
            //generate JWT
            // const aToken = accessToken(user._id);
            // const rToken = refreshToken(user._id);
            // user.refreshToken = rToken; //add refresh token to DB   
            // await user.save();
            // res.setHeader('authorization' , `Bearer ${rToken}`).status(200).json({ user: user , 'accesstoken' : aToken  });
            
        } catch (ex) {
            next(ex);
        }
    };
    

const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;

    try {
        const usernamecheck = await User.findOne({ username: username });
        if (usernamecheck) {
            return res.json({ msg: 'Username is already used.', status: false });
        }
        const emailcheck = await User.findOne({ email: email });
        if (emailcheck) {
            return res.json({ msg: 'Email is already used.', status: false });
        }
        const hashedpassword = await bcrypt.hash(password, 10);

        // const user = new User();
        // user.username = username;
        // user.email = email;
        // user.password = hashedpassword;
        const user = await User.create({ username, email, password: hashedpassword });
        await user.save();
        delete user.password;
        res.json({ status: true, user: user });
    } catch (ex) {
        next(ex);
    }
};

export const readAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await User.find({ _id: { $ne: req.params.id } }).select(['email', 'username', 'avatarImage', '_id']);
        return res.json(users);
    } catch (ex) {
        next(ex);
    }
};

const setAvatar = async (req : Request, res: Response, next : NextFunction) => {
    try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData : any = await User.findByIdAndUpdate(
      userId,
      {
        isAvatarImageSet: true,
        avatarImage,
      },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,

    });
  } catch (ex) {
    next(ex);
  }
    
};

const logOut = async (req : Request, res : Response, next : NextFunction) => {
    try {
       if (!req.params.id) return res.json({ msg: "User id is required " });
          onlineUsers.delete(req.params.id);
  
          // Is refreshToken in header?
        //   const refreshTokenHeader : any = req.headers['authorization'];
        //   if(!refreshTokenHeader) return res.status(401).send("authorization header is requied");
  
          // Is refreshToken in DB?
        //   const authTokenHeader = refreshTokenHeader.split(" ")[1]
        //   const foundUserToLogout = await User.findOne({ refreshToken:authTokenHeader });
        //   if (!foundUserToLogout) {
             
        //      return res.sendStatus(204).send("no user has this refresh token");
        //   }
  
          // Delete refreshToken in db
        //   foundUserToLogout.refreshToken = '';
        //   await foundUserToLogout.save();
        //   res.removeHeader('authorization');
          res.status(200).send();//.redirect("http://localhost:3000/"); 
    } catch (ex) {
      next(ex);
    }
  };



  const forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
  // Send Email to email provided but first check if user exists
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message : "No email could not be sent"});
    }

    // Reset Token Gen and add to database hashed (private) version of token
    const resetToken = user.getResetPasswordToken();


    await user.save();

    // Create reset url to email to provided email
    const resetUrl = `http://localhost:3000/passwordreset/${resetToken}`;

    // HTML Message
    const message = `
    <img src="https://i.ibb.co/q1Hzbxv/tele.jpg" alt="tele" border="0" width="280px" height='100px'>
    <h3>Hi ${user.username},</h3><h4>Someone (hopefully you) has requested a password reset for your Tele-Chat account. Follow the link below to set a new password:</h4>
    <table width="100%" cellspacing="0" cellpadding="0"><tr><td><table cellspacing="0" cellpadding="0"><tr><td style="border-radius: 15px;" bgcolor="#4178f9" height=50px><a href="${resetUrl}" clicktracking=off style="padding: 8px 12px;width:250px;text-align:center; border: 1px solid #39780;border-radius: 2px;font-family: Helvetica, Arial, sans-serif;font-size: 14px; color: #ffffff;text-decoration: none;font-weight:bold;display: inline-block;">
    Click To Reset Your Password</a></td></tr></table></td></tr></table>
    <h4>If you don't wish to reset your password, disregard this email and no action will be taken.</h4><h4>Tele-Chat Team.</h4>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: "Tele-Chat Password Reset Request",
        text: message,
      });

      res.status(200).json({ success: true, data: "Email Sent" });
    } catch (err) {
      console.log(err);

      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save();

      return res.status(500).json({message : "Email could not be sent"});
    }
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
// Compare token in URL params to hashed token

const resetPasswordToken = crypto
.createHash("sha256")
.update(req.params.resetToken)
.digest("hex");


try {
const user = await User.findOne({
  resetPasswordToken,
  resetPasswordExpire: { $gt: Date.now() },
});

if (!user) {
  return res.status(400).json({message : "Invalid Token"});
}


user.password = req.body.password;
user.resetPasswordToken = undefined;
user.resetPasswordExpire = undefined;

await user.save();
delete user.password;
res.status(201).json({
  success: true,
  data: "Password Updated Success",
  user
  //token: user.getSignedJwtToken(),
});
} catch (err) {
next(err);
}
};



export default { createUser, readUser , setAvatar , readAll , logOut , resetPassword ,forgetPassword}; //, readAuthor, updateAuthor, deleteAuthor };

