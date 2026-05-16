# 📋 LEGACY vs WORKFLOW ROUTES - DECISION & PLAN

## Current State (As of May 11, 2026)

### **Routes Currently Mounted** (in `src/app.js`):

**LEGACY ROUTES** (Deprecated but kept):
```javascript
app.use("/api/investments", investmentRoutes);      // Legacy
app.use("/api/mentorship", mentorshipRoutes);       // Legacy
app.use("/api/projects", projectRoutes);            // Legacy
```

**WORKFLOW ROUTES** (Primary - use these):
```javascript
app.use("/api/investment-workflow", investmentWorkflowRoutes);
app.use("/api/mentorship-workflow", mentorshipWorkflowRoutes);
app.use("/api/projects-workflow", projectWorkflowRoutes);
```

---

## 🤔 Why Do We Have Both?

### **Historical Context:**
1. **Phase 1 (Early):** Legacy routes implemented for basic functionality
2. **Phase 2 (Mid):** New workflow routes built with enhanced features
3. **Phase 3 (Current):** Both routes coexist for backward compatibility

### **Workflow Routes Improvements Over Legacy:**
```
LEGACY (/api/investments)              VS    WORKFLOW (/api/investment-workflow)
├── Basic offer/counter flow                  ├── Full negotiation system
├── Limited feedback                          ├── Advanced feedback with ratings
├── Basic payment tracking                    ├── Comprehensive payment workflow
└── Simple status updates                     └── Real-time status notifications
```

---

## 📊 Feature Comparison

### Investment Routes:
```
LEGACY ENDPOINTS                          WORKFLOW ENDPOINTS
POST   /investments                       POST   /offers
GET    /investments/:id                   GET    /offers/:id
PUT    /investments/:id                   POST   /counter-offer
POST   /investments/payment               PUT    /respond
GET    /investments/list                  GET    /portfolio, /received
                                          POST   /payment
                                          POST   /feedback
                                          GET    /feedback
```

### Mentorship Routes:
```
LEGACY ENDPOINTS                          WORKFLOW ENDPOINTS
POST   /mentorship                        POST   /requests
GET    /mentorship/:id                    GET    /requests
PUT    /mentorship/:id                    POST   /requests/:id/accept
POST   /mentorship/feedback               POST   /sessions
                                          POST   /feedback
                                          PUT    /sessions/:id/complete
```

---

## ✅ RECOMMENDATION FOR RENDER DEPLOYMENT

### **Decision: KEEP BOTH for now, but prioritize workflow routes**

**Reasons:**
1. **No Breaking Changes:** Existing clients/integrations not disrupted
2. **Gradual Migration:** New integrations use workflow, old ones still work
3. **Feature Complete:** Workflow routes have all features + more
4. **Low Risk:** Mounting extra routes has minimal performance impact

### **Migration Path:**
```
Timeline:
┌─ NOW (May 2026)
│  ├─ Keep both routes mounted
│  ├─ Mark legacy routes as deprecated in docs
│  └─ Document workflow routes as primary
│
├─ 3-6 MONTHS
│  ├─ Migrate existing clients to workflow routes
│  ├─ Add deprecation warnings to legacy endpoints
│  └─ Log usage of legacy vs workflow routes
│
└─ 6-12 MONTHS  
   ├─ Stop accepting new legacy integrations
   ├─ Schedule legacy route removal
   └─ Remove legacy routes (breaking change)
```

---

## 🎯 WHAT YOU SHOULD USE FOR NEW FEATURES

### **For New Development:**
✅ Use **WORKFLOW routes** (`/api/investment-workflow`, etc.)

**Why:**
- More features (feedback, negotiation, real-time events)
- Better structured
- Real-time notifications via Socket.io
- Designed for modern applications

### **Example: New Investment Feature**
```bash
# ✅ CORRECT - Use workflow
POST /api/investment-workflow/offers
PUT  /api/investment-workflow/investments/:id/respond
POST /api/investment-workflow/investments/:id/payment

# ❌ AVOID - Legacy routes
POST /api/investments
PUT  /api/investments/:id
POST /api/investments/payment
```

---

## 📝 Code Organization in `src/`

### **Legacy Controllers** (Still maintained):
```
src/controllers/
├── investmentController.js     → /api/investments (legacy)
├── mentorshipController.js     → /api/mentorship (legacy)
└── projectController.js        → /api/projects (legacy)
```

### **Workflow Controllers** (Primary):
```
src/controllers/
├── investmentWorkflowController.js     → /api/investment-workflow
├── mentorshipWorkflowController.js     → /api/mentorship-workflow
├── projectWorkflowController.js        → /api/projects-workflow
├── mentorshipAdvancedController.js     (advanced features)
└── mentorshipSchedulingController.js   (scheduling features)
```

---

## 🔍 Route Status Summary

| Route | Status | Use For | Notes |
|-------|--------|---------|-------|
| `/api/investments` | ⚠️ Legacy | Backward compatibility only | Don't use for new features |
| `/api/investment-workflow` | ✅ Primary | All new features | Full workflow, real-time |
| `/api/mentorship` | ⚠️ Legacy | Backward compatibility only | Limited features |
| `/api/mentorship-workflow` | ✅ Primary | New mentorship features | Advanced scheduling |
| `/api/projects` | ⚠️ Legacy | Backward compatibility only | Basic tracking only |
| `/api/projects-workflow` | ✅ Primary | New project features | Full workflow tracking |

---

## 💡 For Your Frontend/Mobile App

### **When Integrating with Backend:**

```javascript
// ✅ CORRECT - Use workflow routes
const investmentAPI = {
  createOffer: POST /api/investment-workflow/offers
  sendCounter: POST /api/investment-workflow/investments/:id/counter-offer
  processPayment: POST /api/investment-workflow/investments/:id/payment
  submitFeedback: POST /api/investment-workflow/investments/:id/feedback
}

// ❌ DON'T USE - Legacy routes
const legacyAPI = {
  createInvestment: POST /api/investments              // Don't use
  updateInvestment: PUT /api/investments/:id           // Don't use
  processPayment: POST /api/investments/payment        // Don't use
}
```

---

## 🗑️ Cleanup Strategy (Post-Deployment)

### **After Render Deployment:**

1. **Monitor Usage** (Week 1-2):
   ```bash
   # Log which routes are being used
   # Check server logs for /api/investments vs /api/investment-workflow usage
   ```

2. **Document Deprecation** (Week 3-4):
   ```bash
   # Add deprecation warnings to legacy routes
   # Email users about migration path
   # Update API documentation
   ```

3. **Gradual Removal** (Month 2-3):
   ```bash
   # Set legacy route removal date (e.g., 6 months out)
   # Add countdown in API responses
   # Start rejecting new legacy integrations
   ```

4. **Complete Removal** (Month 6+):
   ```bash
   # Remove legacy controllers
   # Remove legacy routes  
   # Update documentation
   # Consider a major version bump
   ```

---

## ✅ DEPLOYMENT CHECKLIST

- [x] Both legacy and workflow routes mounted in `src/app.js`
- [x] Workflow routes have complete features
- [x] All controllers properly imported
- [x] Database schema supports both (backward compatible)
- [x] Documentation updated with workflow-first guidance
- [x] Postman collection has all endpoints
- [x] No breaking changes for existing clients
- [ ] Set up monitoring to track route usage (post-deploy)
- [ ] Plan deprecation timeline
- [ ] Communicate with existing clients about migration

---

## 📚 Reference

**Legacy Route Files:**
- `src/routes/investmentRoutes.js`
- `src/routes/mentorshipRoutes.js`
- `src/routes/projectRoutes.js`

**Workflow Route Files:**
- `src/routes/investmentWorkflowRoutes.js`
- `src/routes/mentorshipWorkflowRoutes.js`
- `src/routes/projectWorkflowRoutes.js`

**Controllers:**
- Legacy: `src/controllers/investmentController.js`, etc.
- Workflow: `src/controllers/investmentWorkflowController.js`, etc.

---

## 🚀 Bottom Line

✅ **Current Status:** Both routes working, no breaking changes
✅ **For New Features:** Use workflow routes
✅ **For Backward Compatibility:** Legacy routes still available
✅ **Timeline:** Remove legacy routes 6-12 months from now
✅ **Ready for Render:** Yes, deployment can proceed immediately
