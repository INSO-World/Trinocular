import { getServiceStatus } from '../../common/index.js';

export async function getStatusPage(req, res) {
  const visualizations= await getServiceStatus(process.env.VISUALIZATION_GROUP_NAME);

  res.render('status', {
    user: req.user,
    visualizations
  });
}
