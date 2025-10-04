index.ts
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// CORS ve Logger middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://www.figma.com'],
  allowHeaders: ['Content-Type', 'Authorization', 'Admin-Token'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use('*', logger(console.log));

// Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

console.log('🚀 GigSmart Backend Server Starting...');
console.log('📡 Environment:', {
  url: Deno.env.get('SUPABASE_URL')?.slice(0, 30) + '...',
  hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY')
});

// ============================================================================
// STEP 0: BASIC PING 
// ============================================================================

app.get('/make-server-666ac5b7/ping', (c) => {
  console.log('🏓 Ping requested');
  return c.json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    server: 'GigSmart Backend'
  });
});

// ============================================================================
// STEP 1: BASIC HEALTH CHECK
// ============================================================================

app.get('/make-server-666ac5b7/health', async (c) => {
  console.log('🏥 Health check requested from:', c.req.header('User-Agent'));
  console.log('🏥 Authorization header:', c.req.header('Authorization')?.slice(0, 50) + '...');
  
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('kv_store_666ac5b7')
      .select('*')
      .limit(1);
    
    const supabaseStatus = error ? 'error' : 'connected';
    
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'GigSmart Backend v1.0',
      environment: 'production',
      env: {
        hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
        supabaseUrl: Deno.env.get('SUPABASE_URL')?.slice(0, 30) + '...'
      },
      supabase: {
        status: supabaseStatus,
        error: error?.message || null
      }
    };
    
    console.log('✅ Health check successful:', healthData);
    return c.json(healthData);
  } catch (err) {
    console.error('❌ Health check error:', err);
    const errorData = {
      status: 'error',
      timestamp: new Date().toISOString(),
      server: 'GigSmart Backend v1.0',
      environment: 'production',
      env: {
        hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
        supabaseUrl: Deno.env.get('SUPABASE_URL')?.slice(0, 30) + '...'
      },
      supabase: {
        status: 'error',
        error: err.message
      }
    };
    
    console.log('❌ Returning error data:', errorData);
    return c.json(errorData, 500);
  }
});

// ============================================================================
// STEP 2: DATABASE CONNECTION TEST
// ============================================================================

app.get('/make-server-666ac5b7/test/db', async (c) => {
  console.log('🗃️ Testing database connection...');
  
  try {
    // Test KV store table
    const { data: kvData, error: kvError } = await supabase
      .from('kv_store_666ac5b7')
      .select('*')
      .limit(1);
    
    console.log('KV Store test result:', { error: kvError, hasData: !!kvData });
    
    // Test job_requests table
    const { data: jobData, error: jobError } = await supabase
      .from('job_requests')
      .select('*')
      .limit(1);
    
    console.log('Job Requests test result:', { error: jobError, hasData: !!jobData });
    
    return c.json({
      success: true,
      tests: {
        kvStore: {
          accessible: !kvError,
          error: kvError?.message || null,
          rowCount: kvData?.length || 0
        },
        jobRequests: {
          accessible: !jobError,
          error: jobError?.message || null,
          rowCount: jobData?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    return c.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// ============================================================================
// STEP 3: ADMIN AUTH (Simple)
// ============================================================================

app.post('/make-server-666ac5b7/admin/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    console.log('🔐 Admin login attempt:', { username });
    
    // Simple hardcoded admin credentials
    if (username === 'admin' && password === 'admin123') {
      const token = `admin_${Date.now()}`;
      console.log('✅ Admin login successful, token:', token);
      
      return c.json({
        success: true,
        token,
        message: 'Admin girişi başarılı'
      });
    } else {
      console.log('❌ Invalid admin credentials');
      return c.json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre'
      }, 401);
    }
    
  } catch (error) {
    console.error('❌ Admin login error:', error);
    return c.json({
      success: false,
      message: 'Giriş sırasında hata oluştu'
    }, 500);
  }
});

// ============================================================================
// STEP 4: ADMIN API ENDPOINTS
// ============================================================================

// Admin Stats
app.get('/make-server-666ac5b7/admin/stats', async (c) => {
  try {
    const adminToken = c.req.header('Admin-Token');
    if (!adminToken || !adminToken.startsWith('admin_')) {
      return c.json({ success: false, message: 'Geçersiz admin session' }, 401);
    }

    console.log('🔍 Fetching admin stats...');
    
    // Return demo stats for now
    const stats = {
      totalUsers: 1250,
      totalCompanies: 89,
      totalEmployees: 1161,
      pendingJobs: 23,
      activeJobs: 45,
      totalApplications: 387
    };

    return c.json(stats);
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    return c.json({ success: false, message: 'Stats alınırken hata oluştu' }, 500);
  }
});

// Admin Jobs
app.get('/make-server-666ac5b7/admin/jobs', async (c) => {
  try {
    const adminToken = c.req.header('Admin-Token');
    if (!adminToken || !adminToken.startsWith('admin_')) {
      return c.json({ success: false, message: 'Geçersiz admin session' }, 401);
    }

    console.log('🔍 Fetching admin jobs...');
    
    // Return demo jobs for now
    const jobs = [
      {
        id: "demo-job-1",
        companyId: "demo-company-1",
        companyName: "TechCorp A.Ş.",
        title: "Mağaza Temizlik Personeli",
        workingHours: "09:00-17:00",
        jobDate: "2024-01-20",
        description: "Mağaza içi temizlik ve düzenleme işleri",
        salary: 500,
        isUrgent: true,
        status: "pending",
        createdAt: "2024-01-15T10:00:00Z",
        applications: []
      },
      {
        id: "demo-job-2", 
        companyId: "demo-company-2",
        companyName: "BuildCorp Ltd.",
        title: "İnşaat İşçisi",
        workingHours: "08:00-18:00",
        jobDate: "2024-01-22",
        description: "Bina inşaat işleri",
        salary: 800,
        isUrgent: false,
        status: "active",
        createdAt: "2024-01-16T14:30:00Z",
        applications: []
      }
    ];

    return c.json(jobs);
  } catch (error) {
    console.error('❌ Admin jobs error:', error);
    return c.json({ success: false, message: 'Jobs alınırken hata oluştu' }, 500);
  }
});

// Admin Users
app.get('/make-server-666ac5b7/admin/users', async (c) => {
  try {
    const adminToken = c.req.header('Admin-Token');
    if (!adminToken || !adminToken.startsWith('admin_')) {
      return c.json({ success: false, message: 'Geçersiz admin session' }, 401);
    }

    console.log('🔍 Fetching admin users...');
    
    // Return demo users for now
    const users = [
      {
        id: "demo-user-1",
        email: "ahmet@email.com",
        fullName: "Ahmet Yılmaz",
        role: "employee",
        profileCompleted: true,
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z"
      },
      {
        id: "demo-user-2",
        email: "techcorp@email.com", 
        fullName: "TechCorp A.Ş.",
        role: "company",
        profileCompleted: true,
        isActive: true,
        createdAt: "2024-01-05T00:00:00Z"
      }
    ];

    return c.json(users);
  } catch (error) {
    console.error('❌ Admin users error:', error);
    return c.json({ success: false, message: 'Users alınırken hata oluştu' }, 500);
  }
});

// Admin Urgent Requests
app.get('/make-server-666ac5b7/admin/urgent-requests', async (c) => {
  try {
    const adminToken = c.req.header('Admin-Token');
    if (!adminToken || !adminToken.startsWith('admin_')) {
      return c.json({ success: false, message: 'Geçersiz admin session' }, 401);
    }

    console.log('🔍 Fetching urgent requests...');
    
    // Return demo urgent requests for now
    const urgentRequests = [
      {
        id: "urgent-1",
        companyId: "demo-company-1",
        companyName: "TechCorp A.Ş.",
        title: "Acil Temizlik Personeli",
        workingHours: "09:00-17:00",
        jobDate: "2024-01-20",
        description: "Acil temizlik ihtiyacı",
        salary: 500,
        isUrgent: true,
        status: "pending",
        createdAt: "2024-01-15T10:00:00Z",
        applications: []
      }
    ];

    return c.json(urgentRequests);
  } catch (error) {
    console.error('❌ Admin urgent requests error:', error);
    return c.json({ success: false, message: 'Urgent requests alınırken hata oluştu' }, 500);
  }
});

// Admin Job Approve
app.put('/make-server-666ac5b7/admin/jobs/:jobId/approve', async (c) => {
  try {
    const adminToken = c.req.header('Admin-Token');
    if (!adminToken || !adminToken.startsWith('admin_')) {
      return c.json({ success: false, message: 'Geçersiz admin session' }, 401);
    }

    const jobId = c.req.param('jobId');
    console.log('✅ Approving job:', jobId);
    
    // Mock job approval - in a real app, this would update database
    const approvedJob = {
      id: jobId,
      companyId: "demo-company-1",
      companyName: "TechCorp A.Ş.",
      title: "Mağaza Temizlik Personeli",
      workingHours: "09:00-17:00",
      jobDate: "2024-01-20",
      description: "Mağaza içi temizlik ve düzenleme işleri",
      salary: 500,
      isUrgent: true,
      status: "active", // Changed from pending to active
      createdAt: "2024-01-15T10:00:00Z",
      approvedAt: new Date().toISOString(),
      applications: []
    };

    return c.json({
      success: true,
      message: 'İş ilanı başarıyla onaylandı',
      job: approvedJob
    });
  } catch (error) {
    console.error('❌ Admin approve job error:', error);
    return c.json({ success: false, message: 'İş ilanı onaylanırken hata oluştu' }, 500);
  }
});

// Admin Job Reject
app.put('/make-server-666ac5b7/admin/jobs/:jobId/reject', async (c) => {
  try {
    const adminToken = c.req.header('Admin-Token');
    if (!adminToken || !adminToken.startsWith('admin_')) {
      return c.json({ success: false, message: 'Geçersiz admin session' }, 401);
    }

    const jobId = c.req.param('jobId');
    console.log('❌ Rejecting job:', jobId);
    
    // Mock job rejection - in a real app, this would update database
    const rejectedJob = {
      id: jobId,
      companyId: "demo-company-1",
      companyName: "TechCorp A.Ş.",
      title: "Mağaza Temizlik Personeli",
      workingHours: "09:00-17:00",
      jobDate: "2024-01-20",
      description: "Mağaza içi temizlik ve düzenleme işleri",
      salary: 500,
      isUrgent: true,
      status: "rejected", // Changed from pending to rejected
      createdAt: "2024-01-15T10:00:00Z",
      rejectedAt: new Date().toISOString(),
      applications: []
    };

    return c.json({
      success: true,
      message: 'İş ilanı reddedildi',
      job: rejectedJob
    });
  } catch (error) {
    console.error('❌ Admin reject job error:', error);
    return c.json({ success: false, message: 'İş ilanı reddedilirken hata oluştu' }, 500);
  }
});

// ============================================================================
// STEP 5: JOB REQUESTS - COMPANY ENDPOINTS
// ============================================================================

// Create Job Request (Company Form Submission)
app.post('/make-server-666ac5b7/job_requests', async (c) => {
  console.log('📝 New job request received');
  
  try {
    const body = await c.req.json();
    const { company_id, title, date, shift, description, salary, location } = body;

    // Validate required fields
    if (!company_id || !title) {
      console.log('❌ Missing required fields:', { company_id, title });
      return c.json({ 
        success: false, 
        error: 'Missing required fields: company_id and title are required',
        received: body
      }, 400);
    }

    // Generate unique job ID
    const id = `job-${Date.now()}`;
    const key = `job_requests:${id}`;
    
    // Create job data object
    const jobData = {
      id,
      company_id,
      title,
      date: date || new Date().toISOString().split('T')[0], // Default to today
      shift: shift || 'gündüz', // Default shift
      description: description || '',
      salary: salary || 0,
      location: location || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to KV Store
    await kv.set(key, jobData);
    
    console.log('✅ Job request saved successfully:', { id, key });
    console.log('📋 Job data:', jobData);

    return c.json({ 
      success: true, 
      id, 
      job: jobData,
      message: 'İş talebi başarıyla oluşturuldu'
    }, 201);
    
  } catch (error) {
    console.error('❌ Job request creation error:', error);
    return c.json({ 
      success: false, 
      error: `Job request creation failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Get Job Requests by Company ID
app.get('/make-server-666ac5b7/job_requests/company/:companyId', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    console.log('🔍 Fetching job requests for company:', companyId);
    
    // Get all job requests with prefix
    const allJobs = await kv.getByPrefix('job_requests:');
    
    // Filter by company_id
    const companyJobs = allJobs.filter(job => job.company_id === companyId);
    
    console.log(`✅ Found ${companyJobs.length} job requests for company ${companyId}`);
    
    return c.json({
      success: true,
      jobs: companyJobs,
      count: companyJobs.length
    });
    
  } catch (error) {
    console.error('❌ Get company jobs error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Get All Job Requests (Admin)
app.get('/make-server-666ac5b7/job_requests', async (c) => {
  try {
    console.log('🔍 Fetching all job requests');
    
    // Get all job requests
    const allJobs = await kv.getByPrefix('job_requests:');
    
    // Sort by created_at desc
    allJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log(`✅ Found ${allJobs.length} total job requests`);
    
    return c.json({
      success: true,
      jobs: allJobs,
      count: allJobs.length
    });
    
  } catch (error) {
    console.error('❌ Get all jobs error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Update Job Request Status (Admin)
app.put('/make-server-666ac5b7/job_requests/:jobId/status', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const { status } = await c.req.json();
    
    console.log('🔄 Updating job status:', { jobId, status });
    
    // Validate status
    const validStatuses = ['pending', 'active', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return c.json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, 400);
    }
    
    const key = `job_requests:${jobId}`;
    const existingJob = await kv.get(key);
    
    if (!existingJob) {
      return c.json({
        success: false,
        error: 'Job request not found'
      }, 404);
    }
    
    // Update job data
    const updatedJob = {
      ...existingJob,
      status,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(key, updatedJob);
    
    console.log('✅ Job status updated successfully:', updatedJob);
    
    return c.json({
      success: true,
      job: updatedJob,
      message: `İş durumu ${status} olarak güncellendi`
    });
    
  } catch (error) {
    console.error('❌ Update job status error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// ============================================================================
// 404 Handler
// ============================================================================

app.notFound((c) => {
  console.log('❌ 404 Not Found:', c.req.path);
  return c.json({
    error: 'Endpoint not found',
    path: c.req.path,
    availableEndpoints: [
      'GET /make-server-666ac5b7/ping',
      'GET /make-server-666ac5b7/health',
      'GET /make-server-666ac5b7/test/db',
      'POST /make-server-666ac5b7/admin/login',
      'GET /make-server-666ac5b7/admin/stats',
      'GET /make-server-666ac5b7/admin/jobs',
      'GET /make-server-666ac5b7/admin/users',
      'GET /make-server-666ac5b7/admin/urgent-requests',
      'PUT /make-server-666ac5b7/admin/jobs/:jobId/approve',
      'PUT /make-server-666ac5b7/admin/jobs/:jobId/reject',
      'POST /make-server-666ac5b7/job_requests',
      'GET /make-server-666ac5b7/job_requests',
      'GET /make-server-666ac5b7/job_requests/company/:companyId',
      'PUT /make-server-666ac5b7/job_requests/:jobId/status'
    ]
  }, 404);
});

// ============================================================================
// Error Handler
// ============================================================================

app.onError((err, c) => {
  console.error('❌ Server Error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

console.log('✅ Server configured, starting...');

// Start server
Deno.serve(app.fetch);
