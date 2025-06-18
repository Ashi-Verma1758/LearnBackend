import dotenv from 'dotenv';
import mongoose  from 'mongoose';
import { DB_NAME } from './constants.js';
import connectDB from './db/index.js';
// require

dotenv.config({
    path: './env'
});
//second approach to connect db
connectDB();











// first approach to connect db
// import express from "express";
// const app = express();

// ;(async () =>{
//     try{
//        await  mongoose.connect(`${process.env.MOONGODB_URL}/${DB_NAME}`)
//        app.on("error", (error) =>{
//         console.logg("ERR:", error);
//         throw error;

//        })
//        app.listen(process.env.PORT, ()=>{
//         console.log(`Server is running on port ${process.env.PORT}`);
//        })
//     } catch(error){
//         console.error("ERROR: ", error);
//         throw err
//     }
// })()