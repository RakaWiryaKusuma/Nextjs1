// app/create/page.tsx - COMPLETE FIXED VERSION
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useArticles } from "../contexts/ArticleContext";
import { useDarkMode } from "../hooks/useDarkMode";
import Link from 'next/link';

const categories = [
  "Novel",
  "Cerpen", 
  "Puisi",
  "Opini",
  "Desain Grafis",
  "Coding Project",
  "Cerita Bergambar",
  "Pantun"
];

// Default cover images untuk setiap kategori
const defaultCovers: { [key: string]: string } = {
  'Puisi': '/cover/puisi.jpg',
  'Novel': '/cover/novel.jpg', 
  'Cerpen': '/cover/cerpen.jpg',
  'Opini': '/cover/opini.jpg',
  'Desain Grafis': '/cover/desain.jpg',
  'Coding Project': '/cover/coding.jpg',
  'Cerita Bergambar': '/cover/cergam.jpg',
  'Pantun': '/cover/pantun.jpg'
};

// API Debug Utility
const testApiConnection = async () => {
  try {
    console.log('🔍 Testing API connection...');
    
    // Test 1: Check if API is running
    const healthResponse = await fetch('http://localhost:3001/api/health');
    console.log('🏥 API Health:', healthResponse.status);
    
    // Test 2: Check articles endpoint
    const articlesResponse = await fetch('http://localhost:3001/api/articles?limit=1');
    const articlesData = await articlesResponse.json();
    console.log('📚 Articles endpoint:', articlesData.success ? '✅ OK' : '❌ Failed');
    
    // Test 3: Check user token
    const token = localStorage.getItem('token');
    console.log('🔑 Token exists:', !!token);
    
    if (token) {
      // Test 4: Try to create a test article
      console.log('🧪 Testing article creation...');
      
      const testData = {
        title: "Test Article from Debug",
        content: "This is a test article for debugging purposes.",
        excerpt: "Test article excerpt",
        category_name: "Opini",
        author_name: "Debug User",
        cover_image: "/cover/default.jpg",
        tags: "test,debug",
        status: "published"
      };
      
      try {
        const testResponse = await fetch('http://localhost:3001/api/articles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(testData)
        });
        
        const testResult = await testResponse.json();
        console.log('🧪 Test creation result:', testResult);
        
        if (testResult.success) {
          alert('✅ Test article created successfully!');
        } else {
          alert(`❌ Test failed: ${testResult.message}`);
        }
      } catch (testError) {
        console.error('🧪 Test error:', testError);
        alert('❌ Test connection failed');
      }
    }
    
  } catch (error) {
    console.error('🔧 Debug error:', error);
    alert('❌ Debug failed: ' + error);
  }
};

export default function CreateArticlePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const { createArticle } = useArticles();
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    category_name: "",
    author_name: "",
    cover_image: "",
    tags: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [apiLogs, setApiLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setApiLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Validasi real-time
  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'title':
        if (!value.trim()) {
          newErrors.title = 'Judul karya harus diisi';
        } else if (value.length > 200) {
          newErrors.title = 'Judul maksimal 200 karakter';
        } else {
          newErrors.title = '';
        }
        break;
        
      case 'content':
        if (!value.trim()) {
          newErrors.content = 'Konten karya harus diisi';
        } else if (value.length > 50000) {
          newErrors.content = 'Konten terlalu panjang (maks. 50,000 karakter)';
        } else {
          newErrors.content = '';
        }
        break;
        
      case 'category_name':
        if (!value) {
          newErrors.category_name = 'Kategori wajib dipilih';
        } else {
          newErrors.category_name = '';
        }
        break;

      case 'excerpt':
        if (value.length > 300) {
          newErrors.excerpt = 'Deskripsi singkat maksimal 300 karakter';
        } else {
          newErrors.excerpt = '';
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  // Handle category change - set default cover
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      category_name: category,
      cover_image: defaultCovers[category] || '/cover/default.jpg'
    }));
    validateField('category_name', category);
  };

  // Handle image upload yang SIMPLE dan EFISIEN
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi ukuran file
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, cover_image: 'Ukuran file maksimal 2MB' }));
        return;
      }

      // Validasi tipe file
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, cover_image: 'Hanya file gambar yang diizinkan' }));
        return;
      }

      // Clear error
      setErrors(prev => ({ ...prev, cover_image: '' }));

      // Buat preview menggunakan URL.createObjectURL (LEBIH CEPAT)
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);

      // Untuk sekarang, kita simpan path sementara
      setFormData(prev => ({ 
        ...prev, 
        cover_image: `/uploads/${Date.now()}_${file.name}` // Path sementara
      }));

      addLog(`🖼️ Gambar dipilih: ${file.name} (${Math.round(file.size / 1024)}KB)`);
    }
  };

  // Validasi form sebelum submit
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Judul karya harus diisi';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Judul maksimal 200 karakter';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Konten karya harus diisi';
    } else if (formData.content.length > 50000) {
      newErrors.content = 'Konten terlalu panjang (maks. 50,000 karakter)';
    }

    if (!formData.category_name) {
      newErrors.category_name = 'Kategori wajib dipilih';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit yang ROBUST
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setApiLogs([]);
    
    if (!validateForm()) {
      alert('Harap perbaiki error yang ditampilkan sebelum melanjutkan.');
      return;
    }

    try {
      setIsSubmitting(true);
      addLog('🚀 Memulai proses submit artikel...');

      // Siapkan data untuk dikirim - HARUS sesuai dengan struktur database
      const articleData = {
        title: formData.title.trim(),
        content: formData.content,
        excerpt: formData.excerpt.trim() || formData.content.substring(0, 150) + '...',
        category_name: formData.category_name,
        author_name: formData.author_name.trim() || user?.username,
        cover_image: formData.cover_image || defaultCovers[formData.category_name] || '/cover/default.jpg',
        tags: formData.tags,
        status: user?.role === 'admin' ? 'published' : 'pending'
      };

      addLog(`📦 Menyiapkan data: ${articleData.title}`);
      addLog(`📊 Kategori: ${articleData.category_name}`);
      addLog(`👤 Penulis: ${articleData.author_name}`);

      // Debug token
      const token = localStorage.getItem('token');
      addLog(`🔑 Token tersedia: ${!!token}`);
      
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login ulang.');
      }

      // Coba langsung fetch ke API untuk debugging
      addLog('🔄 Mengirim ke API...');
      
      const response = await fetch('http://localhost:3001/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(articleData)
      });

      addLog(`📡 Response status: ${response.status}`);
      
      const data = await response.json();
      addLog(`📦 API Response: ${JSON.stringify(data)}`);

      if (data.success) {
        const message = user?.role === 'admin' 
          ? '🎉 Karya berhasil dipublikasikan!' 
          : '📝 Karya berhasil diajukan! Menunggu persetujuan admin.';
        
        setSuccessMessage(message);
        addLog('✅ Artikel berhasil dibuat!');
        
        // Reset form
        setFormData({
          title: "",
          content: "",
          excerpt: "",
          category_name: "",
          author_name: "",
          cover_image: "",
          tags: ""
        });
        setImagePreview("");

        // Redirect setelah 3 detik
        setTimeout(() => {
          router.push(user?.role === 'admin' ? '/admin/dashboard' : '/profile');
        }, 3000);

      } else {
        addLog(`❌ API Error: ${data.message}`);
        throw new Error(`Gagal mempublikasikan karya: ${data.message}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error creating article:', error);
      addLog(`❌ Error: ${error.message}`);
      alert(`❌ ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="text-center">
          <h2 className={`text-2xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Silakan login untuk membuat karya
          </h2>
          <Link 
            href="/auth/login" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
    }`}>
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 backdrop-blur-md border-b ${
        darkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-blue-600 bg-clip-text text-transparent">
                    SEIJA
                  </h1>
                  <p className="text-xs text-gray-500">MAGAZINE</p>
                </div>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <Link
                href="/explore"
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                ← Kembali ke Explore
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Success Message */}
            {successMessage && (
              <div className={`mb-6 p-4 rounded-lg ${
                darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <p className="text-green-800 dark:text-green-200">{successMessage}</p>
                </div>
                <p className={`text-sm mt-2 ${
                  darkMode ? 'text-green-300' : 'text-green-600'
                }`}>
                  Akan diarahkan dalam 3 detik...
                </p>
              </div>
            )}

            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Buat Karya Baru</h1>
              <p className={`text-lg ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Bagikan kreativitas Anda dengan komunitas SEIJA
                {user.role !== 'admin' && (
                  <span className="block text-sm text-yellow-600 mt-2">
                    * Karya akan ditinjau terlebih dahulu sebelum dipublikasikan
                  </span>
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Judul Karya *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Berikan judul yang menarik untuk karya Anda..."
                  className={`w-full px-4 py-3 rounded-lg border transition-colors text-lg ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${
                    errors.title ? 'border-red-500 focus:border-red-500' : 'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent'
                  }`}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-2">{errors.title}</p>
                )}
                <div className="flex justify-between mt-1">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Wajib diisi
                  </span>
                  <span className={`text-xs ${
                    formData.title.length > 200 ? 'text-red-500' : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formData.title.length}/200
                  </span>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Kategori *
                </label>
                <select
                  name="category_name"
                  value={formData.category_name}
                  onChange={handleCategoryChange}
                  required
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${
                    errors.category_name ? 'border-red-500' : 'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent'
                  }`}
                >
                  <option value="">Pilih kategori karya Anda</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category_name && (
                  <p className="text-red-500 text-sm mt-2">{errors.category_name}</p>
                )}
              </div>

              {/* Author Name */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Nama Penulis
                </label>
                <input
                  type="text"
                  name="author_name"
                  value={formData.author_name}
                  onChange={handleInputChange}
                  placeholder={`Kosongkan untuk menggunakan "${user.username}"`}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Gambar Cover (Opsional)
                </label>
                <div className="space-y-4">
                  {(imagePreview || formData.cover_image) && (
                    <div className="max-w-md mx-auto">
                      <img 
                        src={imagePreview || formData.cover_image} 
                        alt="Cover preview" 
                        className="rounded-lg shadow-lg max-h-64 object-cover w-full"
                      />
                      <p className={`text-center text-sm mt-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Preview Cover
                      </p>
                    </div>
                  )}
                  
                  <div className="flex space-x-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview("");
                        setFormData(prev => ({ ...prev, cover_image: defaultCovers[formData.category_name] || '/cover/default.jpg' }));
                      }}
                      className={`px-4 py-3 rounded-lg border transition-colors ${
                        darkMode 
                          ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white' 
                          : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900'
                      }`}
                    >
                      Hapus
                    </button>
                  </div>
                  
                  {errors.cover_image && (
                    <p className="text-red-500 text-sm">{errors.cover_image}</p>
                  )}
                  
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    💡 Tips: Unggah gambar cover (maks. 2MB) atau biarkan kosong untuk menggunakan cover default berdasarkan kategori.
                  </p>
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Deskripsi Singkat (Opsional)
                </label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Tulis deskripsi singkat tentang karya Anda... (akan otomatis dibuat dari konten jika dikosongkan)"
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${
                    errors.excerpt ? 'border-red-500' : 'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent'
                  }`}
                />
                {errors.excerpt && (
                  <p className="text-red-500 text-sm mt-2">{errors.excerpt}</p>
                )}
                <div className="flex justify-between mt-1">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Opsional - akan dibuat otomatis dari konten
                  </span>
                  <span className={`text-xs ${
                    formData.excerpt.length > 300 ? 'text-red-500' : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formData.excerpt.length}/300
                  </span>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Konten Karya *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={15}
                  placeholder="Tulis karya Anda di sini... Anda bisa menggunakan format teks biasa."
                  className={`w-full px-4 py-3 rounded-lg border transition-colors font-mono ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${
                    errors.content ? 'border-red-500' : 'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent'
                  }`}
                />
                {errors.content && (
                  <p className="text-red-500 text-sm mt-2">{errors.content}</p>
                )}
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    💡 Tips: Gunakan baris kosong untuk memisahkan paragraf. Untuk puisi, tulis setiap baris dalam baris terpisah.
                  </p>
                  <span className={`text-xs ${
                    formData.content.length > 50000 ? 'text-red-500' : darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {formData.content.length}/50,000
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Tag (Opsional)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="Pisahkan tag dengan koma, contoh: puisi, cinta, alam, inspirasi"
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                />
                <p className={`text-sm mt-2 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  💡 Tag membantu karya Anda lebih mudah ditemukan
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {user.role === 'admin' ? 'Memublikasikan...' : 'Mengajukan...'}
                    </>
                  ) : (
                    user.role === 'admin' ? '🚀 Publikasikan Karya' : '📝 Ajukan untuk Review'
                  )}
                </button>
                
                <Link
                  href="/explore"
                  className={`px-8 py-4 rounded-lg font-semibold transition-colors border ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white' 
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900'
                  }`}
                >
                  Batalkan
                </Link>
              </div>

              {/* API Logs */}
              {apiLogs.length > 0 && (
                <div className={`mt-8 p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
                }`}>
                  <h4 className="font-semibold mb-2">📊 API Logs:</h4>
                  <div className="max-h-40 overflow-y-auto text-sm font-mono">
                    {apiLogs.map((log, index) => (
                      <div key={index} className={`py-1 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Debug Section (Hanya untuk development) */}
              <div className={`mt-8 p-4 rounded-lg ${
                darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">🧪 Debug Tools</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => testApiConnection()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Test API Connection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🔍 Current form data:', formData);
                      console.log('👤 Current user:', user);
                      console.log('🔑 Token:', localStorage.getItem('token'));
                      console.log('📊 Errors:', errors);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Log Debug Info
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const token = localStorage.getItem('token');
                      if (token) {
                        console.log('🔑 Token details:', token);
                        try {
                          const payload = JSON.parse(atob(token.split('.')[1]));
                          console.log('👤 Token payload:', payload);
                        } catch (e) {
                          console.log('❌ Cannot decode token');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    Decode Token
                  </button>
                </div>
              </div>

              {/* Info for regular users */}
              {user.role !== 'admin' && (
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-start">
                    <span className="text-yellow-500 mr-2">💡</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Proses Review</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Karya Anda akan ditinjau terlebih dahulu oleh admin sebelum dipublikasikan. 
                        Proses ini biasanya memakan waktu 1-2 hari. Anda akan mendapatkan notifikasi ketika karya sudah disetujui.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Status */}
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2">📝</span>
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">Status Form</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                      <li>✅ Judul: {formData.title ? 'Terisi' : 'Belum diisi'}</li>
                      <li>✅ Kategori: {formData.category_name ? 'Terpilih' : 'Belum dipilih'}</li>
                      <li>✅ Konten: {formData.content ? `${formData.content.length} karakter` : 'Belum diisi'}</li>
                      <li>🖼️ Cover: {formData.cover_image ? 'Ada' : 'Default'}</li>
                      <li>👤 Penulis: {formData.author_name || user.username}</li>
                      <li>📋 Status: {user.role === 'admin' ? 'Published langsung' : 'Pending review'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}