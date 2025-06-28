import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.models.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import path from 'path';    
import jwt from 'jsonwebtoken';

const genarateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user =await User.findById(userId)
       const accessToken =  user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
       user.refreshToken = refreshToken;
       await user.save({ validateBeforeSave: false });
       return {accessToken, refreshToken};


    } catch(error){
        throw new ApiError(500, "Failed to generate tokens");
    }
}

const registerUser = asyncHandler(async (req, res) =>{
//   get user details from frontend
// validation
//check if user already exists: using email
//create for imags and avatar
// upload them on cloudinary, avatar
//create user object -> create entry in db
//remove password and refresh token field from response
// check for user creation 
//return res

//   get user details from frontend done

const {fullName, email, username, password} = req.body
console.log("email:", email);

// validation
// if(fullName === ""){
//     throw new ApiError(400, "Full name required")
// } we cant write again and again rather we can use array method

if(
    [fullName, email, username, password].some((field) => field?.trim() ==="")
){
    throw new ApiError(400, "all fields required");
}
//check whehter email has @ or not ========> check by

// if(!email.includes("@")){
//     throw new ApiError(400, "Invalid email address");
// }

const existedUser = await User.findOne({
    $or: [ {username},{email}] 
})
if(existedUser){
    throw new ApiError(409, "User already exists with this email or username");
}
const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage[0]?.path;

if(!avatarLocalPath){
    throw new ApiError(400, "Avatar image is required");
}
// console.log("Files received in req.files:", req.files);
// console.log("Avatar local path:", avatarLocalPath);
const normalizedAvatarPath = path.resolve(avatarLocalPath);
const normalizedCoverImagePath = coverImageLocalPath ? path.resolve(coverImageLocalPath) : "";

const avatar = await uploadOnCloudinary(normalizedAvatarPath);
const coverImage = coverImageLocalPath ? await uploadOnCloudinary(normalizedCoverImagePath) : null;
// const avatar = await uploadOnCloudinary(avatarLocalPath)
// const coverImage =  await uploadOnCloudinary(coverImageLocalPath);  
if(!avatar){
    throw new ApiError(500, "Failed to upload avatar image");
}
const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
    email,
    password,
    username: username.toLowerCase()
})

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if(!createdUser){
    throw new ApiError(500, "Failed to create user");
}

return res.status(201).json(
    new ApiResponse(200, createdUser, "User created successfully")
)

})

const loginUser = asyncHandler(async (req, res) =>{
//   get user details from frontend
// validation
//check if user already exists: using email
//password check
//access  and refresh token generation
//send cookies


const {email, username, password} = req.body;
if(!username && !email){
    throw new ApiError(400, "Username and email are required");
}
if(!password){
    throw new ApiError(400, "Password is required");
}

const user = await User.findOne({
    $or: [{email}, {username}]

})
if(!user){
    throw new ApiError(404, "User not found");
}
const ispasswordValid = await user.isPasswordCorrect(password);
if(!ispasswordValid){
    throw new ApiError(401, "Invalid password");
}

const { accessToken, refreshToken } = await genarateAccessAndRefreshTokens(user._id);

const loggedInUser =await User.findById(user.id).select("-password -refreshToken");
const options = {
    httpsOnly : true,
    secure: true
}
// console.log("user succesfully logged in:", loggedInUser);
return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
    new ApiResponse(200, 
        {
            user: loggedInUser, accessToken, refreshToken
        }, 
        "User logged in successfully"
    )
)
});


const logoutUser = asyncHandler(async (req, res) =>{
   await User.findByIdAndUpdate (
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
   const options = {
    httpsOnly : true,
    secure: true
}
// console.log("User logged out successfully:", req.user._id);
return res.status(200)
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json(new ApiResponse(200, {} , "User logged out successfully"))



})

const refreshAccessToken = asyncHandler(async(req, res) =>{

   const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request, refresh token is required");
   }
   
   try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
   const user = await User.findById(decodedToken?._id)
   if(!user){
    throw new ApiError(401, "invalid refreshToken");
   }
   if(incomingRefreshToken !== user.refreshToken){
    throw new ApiError(401, "refreshToken is expired or used");
   }
   const options = {
    httpOnly: true,
    secure: true
   }

   const {accessToken, newrefreshToken} = await genarateAccessAndRefreshTokens(user._id)
   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", newrefreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {accessToken, newrefreshToken},
            "Access token refreshed successfully"
        )
    )
   } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token")
   }
   
})
const changeCurrentPassword = asyncHandler(async(req, res) =>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?.id)
    const ispasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!ispasswordCorrect){
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) =>{
    return res
    .status(200)
    .json(200, req.user, "currecnt user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res) =>{
    const {fullName, email} = req.body
    if(!fullName || !email){
        throw new ApiError(400, "all fields are required")
    }
    const user =  User.findByIdAndUpdate(
    req.user?._id,
        {
            $set: {
                fullName,// fullName: fullName
                email //email: email
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) =>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "AVATAR file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400, "error while uploading on avatar")

    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "coverImage uploaded successfully")
    )
    

})
const updateUserCoverImage = asyncHandler(async(req, res) =>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "cover image file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400, "error while uploading on updateUserCoverImage")

    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "coverImage uploaded successfully")
    )
    
})

const getUserChannelProfile = asyncHandler(async(req, res) =>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }
const channel = await User.aggregate([

    {
        $match: {
            username: username?.toLowerCase()
        }
    },
    {
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
        }
    },
    {
        $lookup:{
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
        }
    },
    {
        $addFields: {
            subscribersCount: {
                $size: "subscribers"
            },
            channelsSubscribedToCounts : {
                $size:"subscribedTo"
            },
            isSubscribed:{
                $condition:{
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }

    },
    {
        $project:{
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubscribedToCounts: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1


        }
    }
])
if (!channel?.length){
    throw new ApiError(404, "channel does not exist")
}
return res
.status(200)
.json(
    new ApiResponse(200, channel[0], "User Channel fetched successfully")
)
})

export {
    registerUser ,
    loginUser,
    logoutUser,
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile

}