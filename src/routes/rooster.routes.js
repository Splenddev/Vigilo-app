import express from 'express';
import {
  createRoster,
  getRoster,
  updateRoster,
  deleteRoster,
  attachRosterToGroup,
} from '../controllers/rooster.controller.js';
import { protect } from '../middleware/protect.js';
import { authorize } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';

const router = express.Router();

router.use(protect);
router.use(authorize([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LECTURER]));

router.post('/', createRoster);

// ✅ Get a group’s roster
router.get('/:groupId', getRoster);

// ✅ Update roster (replace or patch student list)
router.put('/:rosterId', updateRoster);

// ✅ Delete roster & reset group reference
router.delete('/:rosterId', deleteRoster);

// ✅ Attach an existing roster to a group
router.patch('/attach/:groupId/:rosterId', attachRosterToGroup);

export default router;
