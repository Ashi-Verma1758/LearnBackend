import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.models.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import path from 'path';    

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
if(!username || !email){
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
   await User.findByIdandUpdate (
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
return res.status(200)
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json(new ApiResponse(200, {} , "User logged out successfully"))



})

export {
    registerUser ,
    loginUser,
    logoutUser  
}