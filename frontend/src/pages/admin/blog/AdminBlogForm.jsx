import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  Save,
  Send,
  Calendar,
  Clock,
  Image as ImageIcon,
  UploadCloud,
  X,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Tag,
  Folder,
  Globe,
  Search,
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Sparkles
} from 'lucide-react';
import { adminBlogService } from '../../../services/adminApi';
import { resolveImageUrl } from '../../../utils/imageUrl';
import placeholderImg from '../../../assets/images/medicine-placeholder.jpg';
import './AdminBlog.css';

export default function AdminBlogForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category_id: '',
    category_name: '',
    status: 'DRAFT',
    publish_at: '',
    author_name: 'Admin User',
    read_time: '',
    tags: '',
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
    canonical_url: ''
  });

  const [existingImage, setExistingImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Categories list
  const [categories, setCategories] = useState([]);

  // Tag chips
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState([]);

  // Editor Tab: 'write' | 'preview'
  const [activeEditorTab, setActiveEditorTab] = useState('write');
  const textareaRef = useRef(null);

  // Slug auto-generation control
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // UI / Async State
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [saveActionType, setSaveActionType] = useState('save'); // 'draft' | 'publish' | 'schedule'
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Convert string to clean URL slug
  const generateSlug = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/&/g, '-and-')
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Estimate Read Time
  const calculateReadTime = (content) => {
    if (!content) return '1 min read';
    const cleanText = content.replace(/<[^>]*>/g, ' ');
    const wordCount = cleanText.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    return `${minutes} min read`;
  };

  // Load Categories & Current Post if Edit Mode
  useEffect(() => {
    adminBlogService.getCategories()
      .then(res => {
        if (res && res.success && Array.isArray(res.data)) {
          setCategories(res.data);
          if (!isEditMode && res.data.length > 0 && !formData.category_id) {
            setFormData(prev => ({
              ...prev,
              category_id: res.data[0].id,
              category_name: res.data[0].name
            }));
          }
        }
      })
      .catch(err => console.error('Failed to load categories:', err));

    if (isEditMode) {
      setLoading(true);
      adminBlogService.getPost(id)
        .then(res => {
          if (res && res.success && res.data?.post) {
            const p = res.data.post;
            setFormData({
              title: p.title || '',
              slug: p.slug || '',
              excerpt: p.excerpt || '',
              content: p.content || '',
              category_id: p.category_id || '',
              category_name: p.category_name || '',
              status: p.status || 'DRAFT',
              publish_at: p.publish_at ? p.publish_at.replace(' ', 'T').slice(0, 16) : '',
              author_name: p.author_name || 'Admin User',
              read_time: p.read_time || '',
              tags: p.tags || '',
              meta_title: p.meta_title || '',
              meta_description: p.meta_description || '',
              focus_keyword: p.focus_keyword || '',
              canonical_url: p.canonical_url || ''
            });

            if (p.tags) {
              const parsedTags = p.tags.split(',').map(t => t.trim()).filter(Boolean);
              setTagsList(parsedTags);
            }

            if (p.featured_image) {
              setExistingImage(p.featured_image);
              setImagePreview(resolveImageUrl(p.featured_image, placeholderImg));
            }

            setSlugManuallyEdited(true); // Don't overwrite existing slug on edit
          } else {
            throw new Error(res?.message || 'Article not found');
          }
        })
        .catch(err => {
          console.error('Failed to load post for editing:', err);
          setError(err.response?.data?.message || err.message || 'Unable to load article');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, isEditMode]);

  // Handle Title Change with Auto-Slug
  const handleTitleChange = (e) => {
    const titleVal = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, title: titleVal };
      if (!slugManuallyEdited) {
        updated.slug = generateSlug(titleVal);
      }
      return updated;
    });

    if (fieldErrors.title) {
      setFieldErrors(prev => ({ ...prev, title: null }));
    }
  };

  // Handle Slug Change
  const handleSlugChange = (e) => {
    setSlugManuallyEdited(true);
    setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
    if (fieldErrors.slug) {
      setFieldErrors(prev => ({ ...prev, slug: null }));
    }
  };

  // Handle Category Change
  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    const cat = categories.find(c => String(c.id) === String(selectedId));
    setFormData(prev => ({
      ...prev,
      category_id: selectedId,
      category_name: cat ? cat.name : ''
    }));
  };

  // Tag Management
  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^,+|,+$/g, '');
      if (trimmed && !tagsList.includes(trimmed)) {
        const updated = [...tagsList, trimmed];
        setTagsList(updated);
        setFormData(prev => ({ ...prev, tags: updated.join(', ') }));
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updated = tagsList.filter(t => t !== tagToRemove);
    setTagsList(updated);
    setFormData(prev => ({ ...prev, tags: updated.join(', ') }));
  };

  // Handle Image Selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Only JPG, JPEG, PNG, and WEBP images are allowed.', 'error');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be less than 5MB.', 'error');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Quick Formatting Toolbar Helpers
  const insertFormatting = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content || '';
    const selectedText = text.substring(start, end);

    const replacement = `${before}${selectedText || 'Text'}${after}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);

    setFormData(prev => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selectedText ? selectedText.length : 4));
    }, 50);
  };

  // Content change
  const handleContentChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      content: val,
      read_time: calculateReadTime(val)
    }));
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Article title is required.';
    }
    if (!formData.slug.trim()) {
      errors.slug = 'Valid URL slug is required.';
    }
    if (!formData.content.trim()) {
      errors.content = 'Article content cannot be empty.';
    }
    if (formData.status === 'SCHEDULED' && !formData.publish_at) {
      errors.publish_at = 'Publish date & time are required for scheduled posts.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit Handler
  const handleSubmit = async (targetStatus) => {
    const statusToUse = targetStatus || formData.status;

    // If scheduling, ensure status is SCHEDULED
    const finalFormData = {
      ...formData,
      status: statusToUse,
      read_time: formData.read_time || calculateReadTime(formData.content)
    };

    if (statusToUse === 'PUBLISHED' && !finalFormData.publish_at) {
      // Set to now
      const now = new Date();
      finalFormData.publish_at = now.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Validate
    if (statusToUse !== 'DRAFT') {
      if (!finalFormData.title.trim()) {
        showToast('Please provide an article title.', 'error');
        setFieldErrors(prev => ({ ...prev, title: 'Title is required' }));
        return;
      }
      if (!finalFormData.content.trim()) {
        showToast('Please enter article content before publishing.', 'error');
        setFieldErrors(prev => ({ ...prev, content: 'Content is required' }));
        return;
      }
    } else {
      if (!finalFormData.title.trim()) {
        showToast('Please enter a draft title.', 'error');
        setFieldErrors(prev => ({ ...prev, title: 'Title is required' }));
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      // Build multipart FormData
      const submissionData = new FormData();
      Object.keys(finalFormData).forEach(key => {
        if (finalFormData[key] !== null && finalFormData[key] !== undefined) {
          submissionData.append(key, finalFormData[key]);
        }
      });

      if (imageFile) {
        submissionData.append('featured_image', imageFile);
      } else if (!existingImage) {
        submissionData.append('remove_image', '1');
      }

      let res;
      if (isEditMode) {
        res = await adminBlogService.updatePost(id, submissionData);
      } else {
        res = await adminBlogService.createPost(submissionData);
      }

      if (res && res.success) {
        const actionLabel =
          statusToUse === 'PUBLISHED'
            ? 'published successfully!'
            : statusToUse === 'SCHEDULED'
            ? 'scheduled successfully!'
            : 'saved as draft!';
        showToast(`Article "${finalFormData.title}" ${actionLabel}`, 'success');
        setTimeout(() => {
          navigate('/admin/blog');
        }, 800);
      } else {
        throw new Error(res?.message || 'Failed to save article.');
      }
    } catch (err) {
      console.error('Save error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save article.';
      setError(msg);
      showToast(msg, 'error');

      // Specific error mapping
      if (msg.toLowerCase().includes('slug already exists')) {
        setFieldErrors(prev => ({ ...prev, slug: 'This URL slug is already taken. Please choose a unique slug.' }));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="blg-page-wrapper">
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <RefreshCw size={36} className="blg-spin" style={{ color: 'var(--blg-primary)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Loading article details...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="blg-page-wrapper">
      {/* Toast */}
      {toastMessage && (
        <div className={`blg-toast ${toastMessage.type === 'error' ? 'error' : toastMessage.type === 'info' ? 'info' : ''}`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="blg-header">
        <div>
          <div className="blg-breadcrumb">
            <Link to="/admin">Admin</Link>
            <ChevronRight size={14} />
            <Link to="/admin/blog">Blog</Link>
            <ChevronRight size={14} />
            <span className="blg-breadcrumb-current">
              {isEditMode ? 'Edit Article' : 'New Post'}
            </span>
          </div>
          <div className="blg-title-wrap">
            <h1>{isEditMode ? 'Edit Healthcare Article' : 'Create New Article'}</h1>
            <p className="blg-subtitle">
              {isEditMode
                ? `Updating "${formData.title || 'Untitled'}"`
                : 'Write, format and publish a new health, wellness or pharmaceutical post.'}
            </p>
          </div>
        </div>

        <div className="blg-header-actions">
          <Link to="/admin/blog" className="blg-btn blg-btn-secondary">
            <ArrowLeft size={16} />
            Back to List
          </Link>

          {isEditMode && formData.slug && (
            <a
              href={`/blog/${formData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="blg-btn blg-btn-secondary"
              title="Preview Customer Page"
            >
              <Eye size={16} />
              View Public Page
            </a>
          )}

          <button
            type="button"
            className="blg-btn blg-btn-secondary"
            onClick={() => handleSubmit('DRAFT')}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            className="blg-btn blg-btn-primary"
            onClick={() => handleSubmit('PUBLISHED')}
            disabled={saving}
          >
            <Send size={16} />
            {saving ? 'Publishing...' : 'Publish Now'}
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          style={{
            background: 'var(--blg-danger-bg)',
            border: '1px solid var(--blg-danger-border)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--blg-danger)'
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{error}</span>
        </div>
      )}

      {/* Editor Grid Layout */}
      <div className="blg-editor-container">
        {/* Main Content Column (Left) */}
        <div className="blg-editor-main">
          {/* Section: Basic Information */}
          <div className="blg-card">
            <div className="blg-section-title">
              <FileText size={18} style={{ color: 'var(--blg-primary)' }} />
              Basic Information
            </div>

            <div className="blg-form-group">
              <label htmlFor="post-title">
                Article Title <span style={{ color: 'var(--blg-danger)' }}>*</span>
              </label>
              <input
                id="post-title"
                type="text"
                className={`blg-form-input ${fieldErrors.title ? 'error' : ''}`}
                placeholder="e.g. 10 Essential Vitamins for Better Health"
                value={formData.title}
                onChange={handleTitleChange}
              />
              {fieldErrors.title && <span className="blg-form-error">{fieldErrors.title}</span>}
            </div>

            <div className="blg-form-group">
              <label htmlFor="post-slug">
                URL Slug <span style={{ color: 'var(--blg-danger)' }}>*</span>
              </label>
              <input
                id="post-slug"
                type="text"
                className={`blg-form-input ${fieldErrors.slug ? 'error' : ''}`}
                placeholder="e.g. 10-essential-vitamins-for-better-health"
                value={formData.slug}
                onChange={handleSlugChange}
              />
              <span className="blg-form-help">
                Preview: <code>https://medicareplus.com/blog/{formData.slug || 'your-slug'}</code>
              </span>
              {fieldErrors.slug && <span className="blg-form-error">{fieldErrors.slug}</span>}
            </div>

            <div className="blg-form-group">
              <label htmlFor="post-excerpt">Article Excerpt / Summary</label>
              <textarea
                id="post-excerpt"
                rows={3}
                className="blg-form-input"
                style={{ height: 'auto', resize: 'vertical' }}
                placeholder="Brief 1-2 sentence overview shown on blog cards and search listings..."
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              />
              <span className="blg-form-help">Recommended 120–160 characters for high click-through rates.</span>
            </div>
          </div>

          {/* Section: Article Content */}
          <div className="blg-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div className="blg-section-title" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
                <Sparkles size={18} style={{ color: 'var(--blg-primary)' }} />
                Article Content
              </div>

              {/* Write vs Preview Tabs */}
              <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('write')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '6px',
                    background: activeEditorTab === 'write' ? '#FFFFFF' : 'transparent',
                    color: activeEditorTab === 'write' ? 'var(--blg-primary)' : 'var(--blg-text-muted)',
                    boxShadow: activeEditorTab === 'write' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('preview')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '6px',
                    background: activeEditorTab === 'preview' ? '#FFFFFF' : 'transparent',
                    color: activeEditorTab === 'preview' ? 'var(--blg-primary)' : 'var(--blg-text-muted)',
                    boxShadow: activeEditorTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Live Preview
                </button>
              </div>
            </div>

            {activeEditorTab === 'write' ? (
              <>
                {/* Formatting Toolbar */}
                <div className="blg-editor-toolbar">
                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<strong>', '</strong>')}
                    title="Bold"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    title="Italic"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<u>', '</u>')}
                    title="Underline"
                  >
                    <Underline size={15} />
                  </button>

                  <div className="blg-toolbar-divider" />

                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<h2>', '</h2>')}
                    title="Heading 2"
                  >
                    <Heading2 size={15} />
                  </button>
                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<h3>', '</h3>')}
                    title="Heading 3"
                  >
                    <Heading3 size={15} />
                  </button>
                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<p>', '</p>')}
                    title="Paragraph"
                  >
                    &para;
                  </button>

                  <div className="blg-toolbar-divider" />

                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                    title="Bullet List"
                  >
                    <List size={15} />
                  </button>
                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<ol>\n  <li>', '</li>\n</ol>')}
                    title="Numbered List"
                  >
                    <ListOrdered size={15} />
                  </button>
                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<blockquote>', '</blockquote>')}
                    title="Quote"
                  >
                    <Quote size={15} />
                  </button>
                  <button
                    type="button"
                    className="blg-toolbar-btn"
                    onClick={() => insertFormatting('<a href="https://">', '</a>')}
                    title="Insert Link"
                  >
                    <Link2 size={15} />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  className="blg-editor-textarea"
                  placeholder="Write your article in HTML or text format. Use the quick formatting buttons above for headings, bold, lists, and quotes..."
                  value={formData.content}
                  onChange={handleContentChange}
                />
              </>
            ) : (
              <div
                style={{
                  minHeight: '380px',
                  padding: '24px',
                  background: '#FFFFFF',
                  border: '1px solid var(--blg-card-border)',
                  borderRadius: 'var(--blg-radius-sm)',
                  lineHeight: '1.7',
                  color: 'var(--blg-text-main)'
                }}
              >
                {formData.content ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: formData.content }}
                    style={{ fontSize: '15px' }}
                  />
                ) : (
                  <p style={{ color: 'var(--blg-text-light)', fontStyle: 'italic' }}>
                    Article content is empty. Type in the Write tab to see preview here.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span className="blg-form-help">
                Estimated Reading Time: <strong>{formData.read_time || '1 min read'}</strong>
              </span>
              <span className="blg-form-help">
                Word count: <strong>{formData.content ? formData.content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length : 0}</strong>
              </span>
            </div>
            {fieldErrors.content && <span className="blg-form-error">{fieldErrors.content}</span>}
          </div>

          {/* Section: SEO */}
          <div className="blg-card">
            <div className="blg-section-title">
              <Globe size={18} style={{ color: 'var(--blg-primary)' }} />
              Search Engine Optimization (SEO)
            </div>

            <div className="blg-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="meta-title">Meta Title</label>
                <span style={{ fontSize: '11px', color: (formData.meta_title || '').length > 60 ? 'var(--blg-danger)' : 'var(--blg-text-light)' }}>
                  {(formData.meta_title || '').length} / 60
                </span>
              </div>
              <input
                id="meta-title"
                type="text"
                className="blg-form-input"
                placeholder={formData.title || 'Optimal search title'}
                value={formData.meta_title}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
              />
            </div>

            <div className="blg-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="meta-desc">Meta Description</label>
                <span style={{ fontSize: '11px', color: (formData.meta_description || '').length > 160 ? 'var(--blg-danger)' : 'var(--blg-text-light)' }}>
                  {(formData.meta_description || '').length} / 160
                </span>
              </div>
              <textarea
                id="meta-desc"
                rows={2}
                className="blg-form-input"
                style={{ height: 'auto', resize: 'vertical' }}
                placeholder="Concise Google search snippet description..."
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="blg-form-group">
                <label htmlFor="focus-keyword">Focus Keyword</label>
                <input
                  id="focus-keyword"
                  type="text"
                  className="blg-form-input"
                  placeholder="e.g. vitamins, healthcare"
                  value={formData.focus_keyword}
                  onChange={(e) => setFormData(prev => ({ ...prev, focus_keyword: e.target.value }))}
                />
              </div>

              <div className="blg-form-group">
                <label htmlFor="canonical-url">Canonical URL</label>
                <input
                  id="canonical-url"
                  type="url"
                  className="blg-form-input"
                  placeholder="https://medicareplus.com/blog/..."
                  value={formData.canonical_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, canonical_url: e.target.value }))}
                />
              </div>
            </div>

            {/* Google SERP Snippet Preview */}
            <div style={{ marginTop: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', marginBottom: '8px' }}>
                Google Search Result Preview
              </div>
              <div style={{ fontSize: '12px', color: '#202124', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#087F73' }}>https://medicareplus.com</span>
                <span style={{ color: '#5f6368' }}>&rsaquo; blog &rsaquo; {formData.slug || 'slug'}</span>
              </div>
              <div style={{ fontSize: '17px', color: '#1a0dab', fontWeight: '500', marginBottom: '4px', cursor: 'pointer' }}>
                {formData.meta_title || formData.title || 'Article Title — Medicare PLUS'}
              </div>
              <div style={{ fontSize: '13px', color: '#4d5156', lineHeight: '1.4' }}>
                {formData.meta_description || formData.excerpt || 'Learn expert health and wellness insights from verified pharmacists and medical contributors at Medicare PLUS.'}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column (Right) */}
        <div className="blg-editor-sidebar">
          {/* Publishing Controls */}
          <div className="blg-card">
            <div className="blg-section-title">
              <Calendar size={18} style={{ color: 'var(--blg-primary)' }} />
              Publishing Options
            </div>

            <div className="blg-form-group">
              <label htmlFor="post-status">Status</label>
              <select
                id="post-status"
                className="blg-select"
                style={{ width: '100%' }}
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="DRAFT">Draft (Unpublished)</option>
                <option value="PUBLISHED">Published (Public)</option>
                <option value="SCHEDULED">Scheduled (Future)</option>
                <option value="ARCHIVED">Archived (Hidden)</option>
              </select>
            </div>

            <div className="blg-form-group">
              <label htmlFor="post-publish-at">
                {formData.status === 'SCHEDULED' ? 'Schedule Date & Time *' : 'Publish Date & Time'}
              </label>
              <input
                id="post-publish-at"
                type="datetime-local"
                className="blg-form-input"
                value={formData.publish_at}
                onChange={(e) => setFormData(prev => ({ ...prev, publish_at: e.target.value }))}
              />
              <span className="blg-form-help">
                {formData.status === 'SCHEDULED'
                  ? 'Article will automatically become public once this time is reached.'
                  : 'Leave empty to publish immediately upon saving.'}
              </span>
              {fieldErrors.publish_at && <span className="blg-form-error">{fieldErrors.publish_at}</span>}
            </div>

            <div className="blg-form-group">
              <label htmlFor="post-author">Author</label>
              <input
                id="post-author"
                type="text"
                className="blg-form-input"
                placeholder="Admin User"
                value={formData.author_name}
                onChange={(e) => setFormData(prev => ({ ...prev, author_name: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="blg-btn blg-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleSubmit(formData.status === 'SCHEDULED' ? 'SCHEDULED' : 'PUBLISHED')}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="blg-spin" />
                    Saving...
                  </>
                ) : formData.status === 'SCHEDULED' ? (
                  <>
                    <Clock size={16} />
                    Schedule Post
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Publish Article
                  </>
                )}
              </button>

              <button
                type="button"
                className="blg-btn blg-btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleSubmit('DRAFT')}
                disabled={saving}
              >
                <Save size={16} />
                Save Draft
              </button>
            </div>
          </div>

          {/* Featured Image */}
          <div className="blg-card">
            <div className="blg-section-title">
              <ImageIcon size={18} style={{ color: 'var(--blg-primary)' }} />
              Featured Image
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />

            {imagePreview ? (
              <div>
                <div className="blg-image-preview-box">
                  <img src={imagePreview} alt="Featured Preview" />
                  <div className="blg-preview-actions">
                    <button
                      type="button"
                      className="blg-btn blg-btn-secondary blg-btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="blg-btn blg-btn-danger blg-btn-sm"
                      onClick={handleRemoveImage}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--blg-text-light)' }}>
                  Recommended: 1200 &times; 630px (16:9 or 2:1 ratio), max 5MB.
                </div>
              </div>
            ) : (
              <div
                className="blg-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={32} style={{ color: 'var(--blg-primary)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--blg-text-main)' }}>
                  Upload Featured Image
                </div>
                <div style={{ fontSize: '11px', color: 'var(--blg-text-light)', marginTop: '4px' }}>
                  PNG, JPG, or WEBP up to 5MB
                </div>
              </div>
            )}
          </div>

          {/* Classification: Category & Tags */}
          <div className="blg-card">
            <div className="blg-section-title">
              <Folder size={18} style={{ color: 'var(--blg-primary)' }} />
              Classification
            </div>

            <div className="blg-form-group">
              <label htmlFor="post-category">Category</label>
              <select
                id="post-category"
                className="blg-select"
                style={{ width: '100%' }}
                value={formData.category_id}
                onChange={handleCategoryChange}
              >
                {categories.map((c) => (
                  <option key={c.id || c.slug} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="blg-form-group">
              <label htmlFor="post-tags">Tags</label>
              <input
                id="post-tags"
                type="text"
                className="blg-form-input"
                placeholder="Type tag and press Enter or comma..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
              <span className="blg-form-help">e.g. vitamins, nutrition, immunity</span>

              {/* Tag Chips */}
              {tagsList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {tagsList.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#F1F5F9',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#475569'
                      }}
                    >
                      <Tag size={10} />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
