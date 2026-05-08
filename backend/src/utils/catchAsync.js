/**
 * catchAsync
 * Higher-order function that wraps Express async route handlers and
 * automatically forwards any thrown errors to the global error handler
 * via next(err) — eliminating try/catch boilerplate from every controller.
 *
 * Usage:
 *   router.get('/resource', catchAsync(async (req, res, next) => {
 *       const data = await SomeModel.find();
 *       res.json({ success: true, data });
 *   }));
 *
 * @param {Function} fn - Async Express handler (req, res, next)
 * @returns {Function}  - Express middleware that catches rejected promises
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        // Robustness check: ensure next is a function. 
        // Some older middleware patterns or incorrect imports can lead to next being undefined.
        const nextFunc = typeof next === 'function' ? next : (err) => {
            console.error('CRITICAL: catchAsync called without a valid next() function!');
            if (err && !res.headersSent) {
                res.status(500).json({ status: 'error', message: err.message || 'Internal Server Error' });
            }
        };

        Promise.resolve(fn(req, res, nextFunc)).catch(nextFunc);
    };
};

module.exports = catchAsync;
