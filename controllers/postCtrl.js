const Posts = require('../models/postModel')
const Comments = require('../models/commentModel')
const Users = require('../models/userModel')

class APIfeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    paginating() {
        const page = this.queryString.page * 1 || 1
        //burdaki regem degisdikce mesela gelen post sayisida degisiyor   (9  5   3)
        const limit = this.queryString.limit * 1 || 9
        const skip = (page - 1) * limit
        this.query = this.query.skip(skip).limit(limit)
        return this;
    }
}

const postCtrl = {
    createPost: async (req, res) => {
        try {
            const { content, images } = req.body
            if (images.length === 0) return res.status(400).json({ msg: "Please add your photo." })
            //burda moingo db ye gonderende req.user.id seklinde gonderik
            const newPost = new Posts({ content, images, user: req.user._id })
            await newPost.save()
            //burda fronta gonderende req.user seklinde gonderik
            res.json({ msg: 'Created Post!', newPost: { ...newPost._doc, user: req.user } })
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    //client da getProfileUsers kullandik
    getPosts: async (req, res) => {
        try {
            //get post gelende artig sadece id gelmiyecek direk acilimi seklinde gelecek
            const features = new APIfeatures(Posts.find({
                user: [...req.user.following, req.user._id]
            }), req.query).paginating()

            const posts = await features.query.sort('-createdAt')
                .populate("user likes", "avatar username fullname followers")
                .populate({
                    path: "comments",
                    populate: {
                        path: "user likes",
                        select: "-password"
                    }
                })
            res.json({ msg: 'Success!', result: posts.length, posts })
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    updatePost: async (req, res) => {
        try {
            const { content, images } = req.body
            const post = await Posts
                .findOneAndUpdate({ _id: req.params.id }, { content, images })
                .populate("user likes", "avatar username fullname")
            // .populate({ path: "comments", populate: { path: "user likes", select: "-password" } })

            res.json({ msg: "Updated Post!", newPost: { ...post._doc, content, images } })
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    likePost: async (req, res) => {
        try {
            //galiba iki defe like etmemesi ucunb unu yazdik
            //ama zaten birdefe tikliyannan sonra tekrar tikliyanda unike edir TYani mence yazmasi anlamsiz
            const post = await Posts.find({ _id: req.params.id, likes: req.user._id })
            if (post.length > 0) return res.status(400).json({ msg: "You liked this post." })

            const like =
                await Posts
                    .findOneAndUpdate({ _id: req.params.id }, { $push: { likes: req.user._id } }, { new: true })

            if (!like) return res.status(400).json({ msg: 'This post does not exist.' })

            res.json({ msg: 'Liked Post!' })

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    unLikePost: async (req, res) => {
        try {

            const like =
                await Posts
                    .findOneAndUpdate({ _id: req.params.id }, { $pull: { likes: req.user._id } }, { new: true })

            if (!like) return res.status(400).json({ msg: 'This post does not exist.' })

            res.json({ msg: 'UnLiked Post!' })

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    //client da getProfileUsers kullandik
    getUserPosts: async (req, res) => {
        try {
            const features = new APIfeatures(Posts.find({ user: req.params.id }), req.query)
                .paginating()
            const posts = await features.query.sort("-createdAt")
            res.json({ posts, result: posts.length })
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    getPost: async (req, res) => {
        try {
            const post = await Posts.findById(req.params.id)
                .populate("user likes", "avatar username fullname followers")
                .populate({ path: "comments", populate: { path: "user likes", select: "-password" } })

            if (!post) return res.status(400).json({ msg: 'This post does not exist.' })
            res.json({ post })
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    getPostsDicover: async (req, res) => {
        try {
            //burda yazilan aggereegate bizde calismadi
            //ona gore bunu yazdk
            const features = new APIfeatures(Posts.find({
                user: [...req.user.following, req.user._id]
            }), req.query).paginating()

            const posts = await features.query.sort('-createdAt')
                .populate("user likes", "avatar username fullname followers")
                .populate({
                    path: "comments",
                    populate: {
                        path: "user likes",
                        select: "-password"
                    }
                })

            return res.json({
                msg: 'Success!',
                result: posts.length,
                posts
            })

            /*
            const newArr = [...req.user.following, req.user._id]
            const num  = req.query.num || 9
            const posts = await Posts.aggregate([  { $match: { user : { $nin: newArr } } }, { $sample: { size: Number(num) } }, ])
            */
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    deletePost: async (req, res) => {
        try {
            const post = await Posts.findOneAndDelete({ _id: req.params.id, user: req.user._id })
            await Comments.deleteMany({ _id: { $in: post.comments } })
//newPost: { ...post, user: req.user }  => bunu notify yazmag ucun kullanirik 
//hemcinin create post icindekide eynisiile Front icinde notifyda kullaniriz
/*
front terefde 

postacationd eletePost 
        const msg = {
            id: post._id,
            text: 'added a new post.',
            recipients: res.data.newPost.user.followers,
            url: `/post/${post._id}`,
        }
*/
            res.json({ msg: 'Deleted Post!', newPost: { ...post, user: req.user } })

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    savePost: async (req, res) => {
        try {
            const user = await Users.find({ _id: req.user._id, saved: req.params.id })
            if (user.length > 0) return res.status(400).json({ msg: "You saved this post." })

            const save = await Users.findOneAndUpdate({ _id: req.user._id }, {
                $push: { saved: req.params.id }
            }, { new: true })

            if (!save) return res.status(400).json({ msg: 'This user does not exist.' })

            res.json({ msg: 'Saved Post!' })

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    unSavePost: async (req, res) => {
        try {
            const save = await Users.findOneAndUpdate({ _id: req.user._id }, {
                $pull: { saved: req.params.id }
            }, { new: true })

            if (!save) return res.status(400).json({ msg: 'This user does not exist.' })

            res.json({ msg: 'unSaved Post!' })

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    getSavePosts: async (req, res) => {
        try {
            const features = new APIfeatures(Posts.find({ _id: { $in: req.user.saved } }), req.query).paginating()
            const savePosts = await features.query.sort("-createdAt")
            res.json({ savePosts, result: savePosts.length })
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
}

module.exports = postCtrl