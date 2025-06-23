import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.models.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';



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

const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage =  await uploadOnCloudinary(coverImageLocalPath);  
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




export {registerUser};