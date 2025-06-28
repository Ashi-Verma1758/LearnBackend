import { Router } from 'express';
import { 
    changeCurrentPassword,
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage
} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js'; // Assuming you have an upload middleware for handling file uploads
const router = Router()
import { verifyJWT } from '../middlewares/auth.middleware.js'; // Middleware to verify JWT
router.route("/register").post(
    upload.fields([
        {
        name: "avatar",
        maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        },

    ]),
    registerUser
); 
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refreshToken").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-acc").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar )
router.route("/coverImage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage )
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)





export default router