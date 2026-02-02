// server.js - COMPLETE VERSION WITH NEXT.JS + EXPRESS
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 SEIJA Magazine Full Stack Server - Railway Ready');
console.log('📦 Mode:', process.env.NODE_ENV || 'development');
console.log('🔧 PORT:', PORT);

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://seijamagazine.site',
  'https://www.seijamagazine.site',
  'https://seijamagazine.vercel.app',
  'https://seija-magazine.vercel.app',
  /\.railway\.app$/,
  /\.vercel\.app$/
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return origin === allowedOrigin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🚫 CORS Blocked Origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfymrinerlgzygnoimve.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_nECRhfJNuXfovy-0-V5Crg_NUCRSZic';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('📊 Supabase connected:', SUPABASE_URL);

// ==================== SERVE NEXT.JS STATIC FILES ====================
// Serve static files from .next/static
app.use('/_next', express.static(path.join(__dirname, '.next')));

// Serve public files
app.use(express.static(path.join(__dirname, 'public')));

// ==================== ROOT ENDPOINT ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SEIJA Magazine Full Stack is running on Railway',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

// ==================== HELPER FUNCTIONS ====================
const validateToken = (token) => {
  try {
    if (!token) return null;
    const user = JSON.parse(token);
    if (!user.id || !user.username || !user.email) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
};

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
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error || !dbUser) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role || 'user'
    };
    
    next();
    
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

const calculateReadTime = (content) => {
  const words = content.trim().split(/\s+/).length;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

// ==================== UPLOAD ENDPOINT ====================
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada file yang diupload'
      });
    }
    
    // Upload to Supabase Storage
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `seija_${timestamp}_${random}${ext}`;
    const filePath = `uploads/${filename}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('seija-files')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      
      // Fallback: Save locally
      try {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const localFilePath = path.join(uploadDir, filename);
        fs.writeFileSync(localFilePath, req.file.buffer);
        
        const fileUrl = `/uploads/${filename}`;
        
        return res.json({
          success: true,
          message: 'Gambar berhasil diupload (local storage)',
          url: fileUrl,
          filename: filename
        });
      } catch (localError) {
        console.error('Local upload error:', localError);
        throw error;
      }
    }
    
    // Get public URL from Supabase
    const { data: urlData } = supabase.storage
      .from('seija-files')
      .getPublicUrl(filePath);
    
    res.json({
      success: true,
      message: 'Gambar berhasil diupload ke cloud',
      url: urlData.publicUrl,
      filename: filename
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload gambar'
    });
  }
});

// For backward compatibility
app.post('/api/upload/image-local', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada file yang diupload'
      });
    }
    
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `seija_${timestamp}_${random}${ext}`;
    
    const uploadDir = process.env.RAILWAY_VOLUME_PATH 
      ? path.join(process.env.RAILWAY_VOLUME_PATH, 'uploads')
      : path.join(__dirname, 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : '';
    const fileUrl = `${baseUrl}/uploads/${filename}`;
    
    res.json({
      success: true,
      message: 'Gambar berhasil diupload',
      url: `/uploads/${filename}`,
      absoluteUrl: fileUrl,
      filename: filename
    });
    
  } catch (error) {
    console.error('Local upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload gambar'
    });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/cover', express.static(path.join(__dirname, 'public/cover')));

// Create directories
['public/uploads', 'public/cover'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// ==================== TEST ENDPOINTS ====================
app.get('/api/test/articles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== AUTH ENDPOINTS ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password diperlukan'
      });
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }
    
    // Verify password
    const passwordValid = bcrypt.compareSync(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }
    
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      avatar_url: user.avatar_url
    };
    
    res.json({
      success: true,
      message: 'Login berhasil',
      user: userData,
      token: JSON.stringify(userData)
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login gagal'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Semua field harus diisi'
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
        message: 'User dengan email atau username ini sudah ada'
      });
    }
    
    const newUser = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash: await bcrypt.hash(password, 10),
      role: 'user',
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
      created_at: new Date().toISOString()
    };
    
    const { data: user, error } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();
    
    if (error) throw error;
    
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    res.json({
      success: true,
      message: 'Registrasi berhasil',
      user: userData,
      token: JSON.stringify(userData)
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registrasi gagal'
    });
  }
});

// ==================== CATEGORIES ====================
app.get('/api/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error || !categories || categories.length === 0) {
      const defaultCategories = [
        { id: 1, name: 'Novel', slug: 'novel', color: '#3B82F6' },
        { id: 2, name: 'Cerpen', slug: 'cerpen', color: '#10B981' },
        { id: 3, name: 'Puisi', slug: 'puisi', color: '#F59E0B' },
        { id: 4, name: 'Opini', slug: 'opini', color: '#EF4444' },
        { id: 5, name: 'Desain Grafis', slug: 'desain-grafis', color: '#8B5CF6' },
        { id: 6, name: 'Coding Project', slug: 'coding-project', color: '#EC4899' },
        { id: 7, name: 'Cerita Bergambar', slug: 'cerita-bergambar', color: '#14B8A6' },
        { id: 8, name: 'Pantun', slug: 'pantun', color: '#F97316' }
      ];
      
      return res.json({
        success: true,
        data: defaultCategories
      });
    }
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil kategori'
    });
  }
});

// ==================== ARTICLES (PUBLIC) ====================
app.get('/api/articles', async (req, res) => {
  try {
    const { 
      search = '', 
      category = 'all', 
      sort = 'newest', 
      page = 1, 
      limit = 12 
    } = req.query;
    
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('status', 'published');
    
    if (search && search.trim() !== '') {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    
    if (category && category !== 'all') {
      query = query.eq('category_name', category);
    }
    
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'popular') {
      query = query.order('view_count', { ascending: false });
    }
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
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
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil artikel'
    });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !article) {
      return res.status(404).json({
        success: false,
        message: 'Artikel tidak ditemukan'
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
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil artikel'
    });
  }
});

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
    
    if (!title || !content || !category_name) {
      return res.status(400).json({
        success: false,
        message: 'Judul, konten, dan kategori harus diisi'
      });
    }
    
    const readTime = calculateReadTime(content);
    
    const articleData = {
      title: title.trim(),
      content: content,
      excerpt: excerpt || content.substring(0, 150) + '...',
      category_name: category_name,
      author_id: req.user.id,
      author_name: author_name || req.user.username,
      cover_image: cover_image || '/cover/default.jpg',
      tags: tags || '[]',
      status: req.user.role === 'admin' ? 'published' : status,
      featured: req.user.role === 'admin' ? featured : false,
      read_time: readTime,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: req.user.role === 'admin' 
        ? 'Karya berhasil dipublikasikan!' 
        : 'Karya berhasil diajukan! Menunggu persetujuan admin.',
      data: data
    });
    
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat artikel'
    });
  }
});

// ==================== CATCH-ALL FOR NEXT.JS ROUTES ====================
// This must be AFTER all your API routes
app.get('*', (req, res) => {
  // If it's an API route that wasn't caught, return 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint tidak ditemukan',
      path: req.path
    });
  }
  
  // Otherwise, serve the Next.js app
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log('✅ SEIJA Magazine Full Stack - Railway Ready');
  console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
  console.log(`📡 Health: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50) + '\n');
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});