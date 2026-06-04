const { query } = require('../config/postgres');
const logger = require('../config/logger');

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " yr" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " mo" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " d" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hr" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " min" + (interval > 1 ? "s" : "") + " ago";
  return "just now";
}

async function getOrgDashboardData(req, res, next) {
  try {
    // 1. Authorize: All authenticated members of an organization can view the dashboard
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized access.' });
    }

    // 2. Extract org_id and strictly enforce tenant isolation
    let orgId = req.user.org_id;
    if (req.user.role === 'admin' && req.query.org_id) {
      orgId = req.query.org_id;
    } else if (req.user.role === 'org_admin') {
      orgId = req.user.org_id;
    }

    // Dynamically resolve organization if req.user.org_id is null/missing
    if (!orgId) {
      const orgResult = await query(
        'SELECT org_id FROM org_members WHERE user_id = $1 LIMIT 1',
        [req.user.user_id || req.user.id]
      );
      if (orgResult.rows.length > 0) {
        orgId = orgResult.rows[0].org_id;
      } else {
        const creatorResult = await query(
          'SELECT id FROM organizations WHERE user_id = $1 LIMIT 1',
          [req.user.user_id || req.user.id]
        );
        if (creatorResult.rows.length > 0) {
          orgId = creatorResult.rows[0].id;
        }
      }
    }

    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required.' });
    }

    // 3. Overall Compliance Score: avg score of assessments for orgId, calculated dynamically
    const complianceRes = await query(
      `SELECT AVG(COALESCE(compliance_score, 0.0)) as avg_score 
       FROM assessments 
       WHERE org_id = $1`,
      [orgId]
    );
    const avgScore = complianceRes.rows[0]?.avg_score;
    const overallCompliance = avgScore ? parseFloat(parseFloat(avgScore).toFixed(1)) : 0.0;

    // 4. Framework Assessments List: active frameworks mapped/assessed
    const frameworksRes = await query(
      "SELECT id, framework as name, compliance_score, status, created_at FROM assessments WHERE org_id = $1 AND status != 'setup' ORDER BY updated_at DESC",
      [orgId]
    );
    const frameworkList = frameworksRes.rows.map(row => {
      const score = row.compliance_score ? parseFloat(parseFloat(row.compliance_score).toFixed(1)) : 0.0;
      return {
        id: row.id,
        name: row.name,
        completion_percentage: score,
        status: row.status,
        created_at: row.created_at
      };
    });

    // 5. Uploaded Policies Counter: count of policies registered under this org
    const policiesCountRes = await query(
      'SELECT COUNT(*) FROM policies WHERE org_id = $1',
      [orgId]
    );
    const uploadedPoliciesCount = parseInt(policiesCountRes.rows[0].count) || 0;

    // 6. Active Team Count: count active members with 'team_lead' or 'team_member' roles
    const teamCountRes = await query(
      "SELECT COUNT(*) FROM org_members WHERE org_id = $1 AND role IN ('team_lead', 'team_member') AND status = 'active'",
      [orgId]
    );
    const activeTeamCount = parseInt(teamCountRes.rows[0].count) || 0;

    // 6.5. Critical Gaps Counter: count active critical risks identified
    const criticalGapsRes = await query(
      `SELECT r.title, a.framework
       FROM risks r
       JOIN assessments a ON r.assessment_id = a.id
       WHERE r.severity = 'critical' 
         AND r.status != 'mitigated'
         AND a.org_id = $1`,
      [orgId]
    );
    const criticalGapsCount = criticalGapsRes.rows.length;
    const criticalGapsList = criticalGapsRes.rows;

    // 6.6. Compliance Hotspots: Worst performing domains across org
    const hotspotsRes = await query(
      `SELECT r.domain, AVG(r.maturity_score) * 20 as score
       FROM responses r
       JOIN assessments a ON r.assessment_id = a.id
       WHERE a.org_id = $1 AND r.domain IS NOT NULL
       GROUP BY r.domain
       HAVING AVG(r.maturity_score) * 20 < 50
       ORDER BY score ASC
       LIMIT 3`,
      [orgId]
    );
    const domainHotspots = hotspotsRes.rows.map(row => ({
      domain: row.domain,
      score: parseFloat(parseFloat(row.score).toFixed(1))
    }));

    // 6.7. Financial Impact Metric: Calculate outstanding cost and liability saved
    const financialRes = await query(
      `SELECT 
         SUM(CASE WHEN r.maturity_score < 3 THEN 1775 ELSE 0 END) as missing_cost,
         SUM(CASE WHEN r.maturity_score = 3 THEN 591 ELSE 0 END) as partial_cost,
         SUM(CASE WHEN r.maturity_score >= 4 THEN 2500 ELSE 0 END) as liability_saved
       FROM responses r
       JOIN assessments a ON r.assessment_id = a.id
       WHERE a.org_id = $1`,
      [orgId]
    );
    const fData = financialRes.rows[0];
    const financialImpact = {
      totalRemediationCostUsd: (parseFloat(fData?.missing_cost) || 0) + (parseFloat(fData?.partial_cost) || 0),
      penaltyLiabilitySavedUsd: parseFloat(fData?.liability_saved) || 0
    };

    // 7. Recent Activities Stream: top 5 latest logs strictly isolated by this org_id
    const activitiesRes = await query(
      `SELECT al.action, al.resource_type, al.created_at, al.details, u.email
       FROM audit_logs al
       JOIN users u ON al.user_id = u.id
       WHERE al.user_id IN (
         SELECT user_id FROM org_members WHERE org_id = $1
         UNION
         SELECT user_id FROM organizations WHERE id = $1
       )
       ORDER BY al.created_at DESC
       LIMIT 5`,
      [orgId]
    );

    const recentActivities = activitiesRes.rows.map(row => {
      const emailPrefix = row.email ? row.email.split('@')[0] : 'user';
      const initials = emailPrefix.substring(0, 2).toUpperCase();
      
      let actionText = row.action;
      if (row.action === 'user.login') {
        actionText = 'logged into the platform';
      } else if (row.action === 'user.register') {
        actionText = 'joined the compliance workspace';
      } else if (row.action === 'assessment.create') {
        actionText = 'created a new compliance framework assessment';
      } else if (row.action === 'assessment.update') {
        actionText = 'updated compliance assessment scope';
      } else if (row.action === 'assessment.complete') {
        actionText = 'completed the compliance assessment';
      } else if (row.action === 'assessment.delete') {
        actionText = 'deleted an assessment';
      } else if (row.action === 'evidence.upload') {
        const fileName = row.details?.original_name || 'evidence file';
        actionText = `uploaded policy/evidence: ${fileName}`;
      } else if (row.action === 'evidence.delete') {
        actionText = 'removed an evidence file';
      } else if (row.action === 'risk.update') {
        actionText = 'updated compliance risk register';
      } else if (row.action === 'collab.invite_create') {
        actionText = `invited team member ${row.details?.email || ''}`;
      } else if (row.action === 'collab.assignment_create') {
        actionText = 'assigned a control questionnaire section';
      } else if (row.action === 'compliance_agent.run') {
        actionText = 'triggered compliance automation agent';
      } else if (row.action === 'compliance_agent.upload') {
        actionText = 'uploaded policy to automation engine';
      } else {
        actionText = row.action.replace(/[_\.]/g, ' ');
      }

      return {
        initials,
        user: emailPrefix,
        action: actionText,
        time: timeAgo(row.created_at)
      };
    });

    // Return the payload
    res.json({
      orgId,
      overallCompliance,
      frameworkAssessments: frameworkList,
      uploadedPoliciesCount,
      activeTeamCount,
      criticalGapsCount,
      criticalGapsList,
      domainHotspots,
      financialImpact,
      recentActivities
    });

  } catch (err) {
    logger.error('Error fetching organization dashboard data:', err);
    next(err);
  }
}

module.exports = {
  getOrgDashboardData
};
