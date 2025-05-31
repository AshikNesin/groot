import { getUser } from '@/models/user.model.js'; // Ensure .js extension
export const displayUser = (req, res) => {
    const user = getUser();
    res.json(user); // Send user as JSON
};
