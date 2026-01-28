// server.js - API Server untuk SEIJA Magazine
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Supabase Configuration
const SUPABASE_URL = 'https://mfymrinerlgzygnoimve.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nECRhfJNuXfovy-0-V5Crg_NUCRSZic';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 SEIJA Magazine API Server');
console.log('📊 Supabase URL:', SUPABASE_URL);

// ==================== HELPER FUNCTIONS ====================

// Simple token validation (for demo)
const validateToken = (token) => {
  try {
    if (!token) return null;
    
    // For demo, token is the user JSON string
    const user = JSON.parse(token);
    return user;
  } catch (error) {
    return null;
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const user = validateToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // Verify user exists in database
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('id', user.id)
      .single();
    
    if (error || !dbUser) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    req.user = dbUser;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Calculate read time
const calculateReadTime = (content) => {
  const words = content.trim().split(/\s+/).length;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

// ==================== API ROUTES ====================

// 1. HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SEIJA Magazine API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 2. AUTHENTICATION ENDPOINTS
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // For demo, use simple password check
    // In production, use bcrypt.compare
    if (password !== 'demo123' && password.length < 6) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Create user object for token
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token: JSON.stringify(userData) // Simple token for demo
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create user
    const newUser = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      role: 'user',
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: user, error } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Create response user object
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    res.json({
      success: true,
      message: 'Registration successful',
      user: userData,
      token: JSON.stringify(userData)
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// 3. ARTICLES ENDPOINTS

// GET ALL ARTICLES
app.get('/api/articles', async (req, res) => {
  try {
    const { 
      search = '', 
      category = 'all', 
      sort = 'newest', 
      page = 1, 
      limit = 12 
    } = req.query;
    
    console.log('📚 Fetching articles with params:', { search, category, sort, page, limit });
    
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' });
    
    // Filter by published status
    query = query.eq('status', 'published');
    
    // Search
    if (search && search.trim() !== '') {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query = query.eq('category_name', category);
    }
    
    // Sorting
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'popular') {
      query = query.order('like_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${count || 0} articles, returning ${data?.length || 0}`);
    
    res.json({
      success: true,
      data: data || [],
      pagination: {
        current: pageNum,
        total: Math.ceil((count || 0) / limitNum),
        totalItems: count || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching articles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching articles',
      error: error.message
    });
  }
});

// GET SINGLE ARTICLE
app.get('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📖 Fetching article: ${id}`);
    
    // First, get the article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (articleError || !article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    // Increment view count
    await supabase
      .from('articles')
      .update({ view_count: (article.view_count || 0) + 1 })
      .eq('id', id);
    
    res.json({
      success: true,
      data: article
    });
    
  } catch (error) {
    console.error('❌ Error fetching article:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching article'
    });
  }
});

// CREATE ARTICLE (PROTECTED)
app.post('/api/articles', authenticate, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      category_name,
      author_name,
      cover_image,
      tags,
      status = 'pending',
      featured = false
    } = req.body;
    
    console.log('📝 Creating article:', { 
      title, 
      category_name, 
      author: author_name || req.user.username 
    });
    
    // Validation
    if (!title || !content || !category_name) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required'
      });
    }
    
    // Calculate read time
    const readTime = calculateReadTime(content);
    
    // Prepare article data
    const articleData = {
      title: title.trim(),
      content: content,
      excerpt: excerpt || content.substring(0, 150) + '...',
      category_name: category_name,
      author_id: req.user.id,
      author_name: author_name || req.user.username,
      cover_image: cover_image || '/cover/default.jpg',
      tags: tags ? JSON.stringify(tags.split(',').map(tag => tag.trim())) : '[]',
      status: req.user.role === 'admin' ? 'published' : status,
      featured: req.user.role === 'admin' ? featured : false,
      read_time: readTime,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('💾 Saving article to database:', articleData.title);
    
    // Insert into database
    const { data, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save article: ' + error.message,
        details: error.details
      });
    }
    
    console.log('✅ Article created successfully:', data.id);
    
    res.json({
      success: true,
      message: req.user.role === 'admin' 
        ? 'Article published successfully' 
        : 'Article submitted for review',
      data: data
    });
    
  } catch (error) {
    console.error('❌ Error creating article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create article: ' + error.message
    });
  }
});

// UPDATE ARTICLE (PROTECTED)
app.put('/api/articles/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if article exists and user is author or admin
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('author_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this article'
      });
    }
    
    // Update article
    const { data, error } = await supabase
      .from('articles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Article updated successfully',
      data: data
    });
    
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update article'
    });
  }
});

// DELETE ARTICLE (PROTECTED)
app.delete('/api/articles/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if article exists and user is author or admin
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('author_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this article'
      });
    }
    
    // Delete article
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete article'
    });
  }
});

// LIKE ARTICLE (PROTECTED)
app.post('/api/articles/:id/like', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if already liked
    const { data: existingLike, error: checkError } = await supabase
      .from('article_likes')
      .select('id')
      .eq('article_id', id)
      .eq('user_id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    let liked = false;
    
    if (existingLike) {
      // Unlike
      await supabase
        .from('article_likes')
        .delete()
        .eq('id', existingLike.id);
      
      // Decrement like count
      await supabase.rpc('decrement', { 
        table_name: 'articles', 
        column_name: 'like_count', 
        id: id 
      });
      
    } else {
      // Like
      await supabase
        .from('article_likes')
        .insert({
          article_id: id,
          user_id: userId,
          created_at: new Date().toISOString()
        });
      
      // Increment like count
      await supabase.rpc('increment', { 
        table_name: 'articles', 
        column_name: 'like_count', 
        id: id 
      });
      
      liked = true;
    }
    
    res.json({
      success: true,
      liked: liked,
      message: liked ? 'Article liked' : 'Article unliked'
    });
    
  } catch (error) {
    console.error('Error liking article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like article'
    });
  }
});

// 4. COMMENTS ENDPOINTS

// GET ARTICLE COMMENTS
app.get('/api/articles/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id(username, avatar_url)
      `)
      .eq('article_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      data: comments || []
    });
    
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments'
    });
  }
});

// ADD COMMENT (PROTECTED)
app.post('/api/articles/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parent_id } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }
    
    const commentData = {
      article_id: id,
      user_id: req.user.id,
      content: content.trim(),
      parent_id: parent_id || null,
      status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select(`
        *,
        users:user_id(username, avatar_url)
      `)
      .single();
    
    if (error) {
      throw error;
    }
    
    // Increment comment count
    await supabase.rpc('increment', { 
      table_name: 'articles', 
      column_name: 'comment_count', 
      id: id 
    });
    
    res.json({
      success: true,
      message: 'Comment added successfully',
      data: data
    });
    
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

// 5. CATEGORIES ENDPOINT
app.get('/api/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      data: categories || []
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// 6. USER PROFILE ENDPOINTS
app.get('/api/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, avatar_url, bio, created_at')
      .eq('id', id)
      .single();
    
    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user's articles
    const { data: articles } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', id)
      .order('created_at', { ascending: false });
    
    res.json({
      success: true,
      data: {
        ...user,
        articles: articles || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📡 Available endpoints:');
  console.log('   GET  /api/health');
  console.log('   POST /api/auth/login');
  console.log('   POST /api/auth/register');
  console.log('   GET  /api/articles');
  console.log('   GET  /api/articles/:id');
  console.log('   POST /api/articles');
  console.log('   PUT  /api/articles/:id');
  console.log('   DELETE /api/articles/:id');
  console.log('   POST /api/articles/:id/like');
  console.log('   GET  /api/articles/:id/comments');
  console.log('   POST /api/articles/:id/comments');
  console.log('   GET  /api/categories');
  console.log('   GET  /api/users/:id');
});