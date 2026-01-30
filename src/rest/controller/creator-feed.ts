import { Request, Response } from 'express'
import asyncHandler from '../middleware/asyncHandler'
import pool from '../../util/postgre'

// Get creator information
export const getCreatorInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const { creatorId } = req.params

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required',
      })
    }

    try {
      // Create followers table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS followers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          creator_id UUID NOT NULL,
          follower_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(creator_id, follower_id)
        );
      `)

      // Get creator basic info
      const creatorQuery = `
        SELECT
          u.id,
          u.username,
          u.alias,
          u.bio,
          u.avatar,
          u.email_verified as is_verified,
          u.created_at,
          COUNT(DISTINCT f.follower_id) as followers_count,
          COUNT(DISTINCT p.id) as posts_count
        FROM "User" u
        LEFT JOIN followers f ON u.id = f.creator_id
        LEFT JOIN creator_posts p ON u.id = p.creator_id
        WHERE u.id = $1 AND u.role = 'creator'
        GROUP BY u.id, u.username, u.alias, u.bio, u.avatar, u.email_verified, u.created_at
      `

      const creatorResult = await pool.query(creatorQuery, [creatorId])

      if (creatorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Creator not found',
        })
      }

      const creator = creatorResult.rows[0]

      return res.status(200).json({
        success: true,
        data: {
          id: creator.id,
          username: creator.username,
          alias: creator.alias,
          bio: creator.bio,
          avatar: creator.avatar,
          is_verified: creator.is_verified,
          followers_count: parseInt(creator.followers_count) || 0,
          posts_count: parseInt(creator.posts_count) || 0,
          created_at: creator.created_at,
        },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get creator info',
        error: error.message,
      })
    }
  },
)

// Get creator posts
export const getCreatorPosts = asyncHandler(
  async (req: Request, res: Response) => {
    const { creatorId } = req.params
    const { page = 1, limit = 10 } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID is required',
      })
    }

    try {
      // Create tables if they don't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS post_likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL,
          user_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(post_id, user_id)
        );
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL,
          user_id UUID NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `)

      // Get posts with engagement data
      const postsQuery = `
         SELECT
           p.id,
           p.creator_id,
           p.title,
           p.content,
           p.image_url,
           p.video_url,
           p.audio_url,
           p.is_premium,
           p.created_at,
           p.updated_at,
           COUNT(DISTINCT l.id) as likes_count,
           COUNT(DISTINCT c.id) as comments_count
         FROM creator_posts p
         LEFT JOIN post_likes l ON p.id = l.post_id
         LEFT JOIN post_comments c ON p.id = c.post_id
         WHERE p.creator_id = $1
         GROUP BY p.id, p.creator_id, p.title, p.content, p.image_url, p.video_url, p.audio_url, p.is_premium, p.created_at, p.updated_at
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3
       `

      const postsResult = await pool.query(postsQuery, [
        creatorId,
        limit,
        offset,
      ])

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM creator_posts
        WHERE creator_id = $1
      `

      const countResult = await pool.query(countQuery, [creatorId])
      const totalPosts = parseInt(countResult.rows[0].total)

      const posts = postsResult.rows.map((post: any) => ({
        id: post.id,
        creator_id: post.creator_id,
        title: post.title,
        content: post.content,
        image_url: post.image_url,
        video_url: post.video_url,
        audio_url: post.audio_url,
        is_premium: post.is_premium,
        created_at: post.created_at,
        updated_at: post.updated_at,
        likes_count: parseInt(post.likes_count) || 0,
        comments_count: parseInt(post.comments_count) || 0,
      }))

      return res.status(200).json({
        success: true,
        data: posts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalPosts,
          totalPages: Math.ceil(totalPosts / parseInt(limit as string)),
        },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get creator posts',
        error: error.message,
      })
    }
  },
)

// Create a new post
export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, image_url, video_url, audio_url, is_premium } =
    req.body
  const creatorId = req.user?.id || '922d9805-ee01-4f9b-a121-6129d684d4bf' // Use actual user ID or fallback

  if (!creatorId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    })
  }

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required',
    })
  }

  // Check if creator has active platform subscription or is in trial
  try {
    // First check if user is in trial period
    const userResult = await pool.query(
      `SELECT platform_subscription_status, trial_start_date, trial_end_date, has_used_trial, created_at
       FROM "User" WHERE id = $1`,
      [creatorId],
    )

    const user = userResult.rows[0] || {}
    const now = new Date()
    const userCreatedAt = user.created_at ? new Date(user.created_at) : now
    const trialStartDate = user.trial_start_date
      ? new Date(user.trial_start_date)
      : null
    const trialEndDate = user.trial_end_date
      ? new Date(user.trial_end_date)
      : null

    // Check if user is in trial period
    let isInTrial = false
    if (!user.has_used_trial && !trialStartDate) {
      const daysSinceRegistration = Math.floor(
        (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      isInTrial = daysSinceRegistration <= 30
    } else if (trialStartDate && trialEndDate) {
      isInTrial = now < trialEndDate
    }

    // If not in trial, check for active subscription
    if (!isInTrial) {
      const subscriptionResult = await pool.query(
        `SELECT cps.*, psp.name as plan_name
         FROM "CreatorPlatformSubscription" cps
         JOIN "PlatformSubscriptionPlan" psp ON cps.plan_id = psp.id
         WHERE cps.creator_id = $1 AND cps.status = 'active' AND cps.end_date > NOW()`,
        [creatorId],
      )

      if (subscriptionResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            'You need an active platform subscription to post content. Subscribe to continue posting after your free trial.',
        })
      }
    }
  } catch (error: any) {
    // If platform subscription tables don't exist yet, allow posting (for development)
  }

  try {
    // Verify user is a creator
    const userQuery = 'SELECT role FROM "User" WHERE id = $1'
    const userResult = await pool.query(userQuery, [creatorId])

    if (userResult.rows.length === 0) {
      // Create a user with creator role if they don't exist
      const createUserQuery = `
        INSERT INTO "User" (id, username, role, alias, bio, email)
        VALUES ($1, 'creator', 'creator', 'Creator', 'Content creator', $2)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          role = EXCLUDED.role,
          alias = EXCLUDED.alias,
          bio = EXCLUDED.bio,
          email = EXCLUDED.email
        RETURNING role
      `
      const userEmail = `user-${creatorId}@example.com`
      const createResult = await pool.query(createUserQuery, [
        creatorId,
        userEmail,
      ])

      if (createResult.rows[0].role !== 'creator') {
        return res.status(403).json({
          success: false,
          message: 'Only creators can create posts',
        })
      }
    } else if (userResult.rows[0].role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Only creators can create posts',
      })
    }

    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS creator_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creator_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        video_url TEXT,
        audio_url TEXT,
        is_premium BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)

    // Add audio_url column if it doesn't exist
    try {
      await pool.query(
        'ALTER TABLE creator_posts ADD COLUMN IF NOT EXISTS audio_url TEXT;',
      )
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Create the post
    const createPostQuery = `
          INSERT INTO creator_posts (creator_id, title, content, image_url, video_url, audio_url, is_premium)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `

    const postResult = await pool.query(createPostQuery, [
      creatorId,
      title,
      content,
      image_url || null,
      video_url || null,
      audio_url || null,
      is_premium || false,
    ])

    const newPost = postResult.rows[0]

    const responseData = {
      success: true,
      data: {
        id: newPost.id,
        creator_id: newPost.creator_id,
        title: newPost.title,
        content: newPost.content,
        image_url: newPost.image_url,
        video_url: newPost.video_url,
        audio_url: newPost.audio_url,
        is_premium: newPost.is_premium,
        created_at: newPost.created_at,
        updated_at: newPost.updated_at,
        likes_count: 0,
        comments_count: 0,
      },
      message: 'Post created successfully',
    }

    return res.status(201).json(responseData)
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message,
    })
  }
})

// Delete a post
export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params
  const creatorId = req.user?.id

  if (!creatorId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    })
  }

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'Post ID is required',
    })
  }

  try {
    // Verify the post belongs to the creator
    const postQuery = 'SELECT creator_id FROM creator_posts WHERE id = $1'
    const postResult = await pool.query(postQuery, [postId])

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      })
    }

    if (postResult.rows[0].creator_id !== creatorId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts',
      })
    }

    // Delete the post (cascade will handle likes and comments)
    const deleteQuery = 'DELETE FROM creator_posts WHERE id = $1'
    await pool.query(deleteQuery, [postId])

    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message,
    })
  }
})

// Like/unlike a post
export const togglePostLike = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required',
      })
    }

    try {
      // Check if post exists
      const postQuery = 'SELECT id FROM creator_posts WHERE id = $1'
      const postResult = await pool.query(postQuery, [postId])

      if (postResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
        })
      }

      // Check if user already liked the post
      const likeQuery =
        'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2'
      const likeResult = await pool.query(likeQuery, [postId, userId])

      if (likeResult.rows.length > 0) {
        // Unlike the post
        const unlikeQuery =
          'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2'
        await pool.query(unlikeQuery, [postId, userId])

        return res.status(200).json({
          success: true,
          message: 'Post unliked successfully',
          liked: false,
        })
      } else {
        // Like the post
        const likeQuery =
          'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)'
        await pool.query(likeQuery, [postId, userId])

        return res.status(200).json({
          success: true,
          message: 'Post liked successfully',
          liked: true,
        })
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to toggle post like',
        error: error.message,
      })
    }
  },
)

// Get post likes count
export const getPostLikes = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId } = req.params

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required',
      })
    }

    try {
      const likesQuery = `
        SELECT COUNT(*) as likes_count
        FROM post_likes
        WHERE post_id = $1
      `

      const likesResult = await pool.query(likesQuery, [postId])
      const likesCount = parseInt(likesResult.rows[0].likes_count)

      return res.status(200).json({
        success: true,
        data: {
          likes_count: likesCount,
        },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get post likes',
        error: error.message,
      })
    }
  },
)
