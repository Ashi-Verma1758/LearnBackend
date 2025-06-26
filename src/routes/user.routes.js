import { Router } from 'express';
import { loginUser, logoutUser, refreshAccessToken, registerUser } from '../controllers/user.controller.js';
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


export default router