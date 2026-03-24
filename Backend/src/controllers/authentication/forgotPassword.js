const User = require("../../models/users");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const forgotPassword = async (req, res) => {
    try {
        const { emailId } = req.body;

        if (!emailId) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await User.findOne({ emailId });
        
        if (!user) {
            return res.status(404).json({ error: "No account found with this email" });
        }

        if (!user.password) {
            return res.status(400).json({ error: "This account uses social login. Please sign in with Google or GitHub." });
        }

        const token = jwt.sign(
            { _id: user._id, purpose: 'reset-password' },
            process.env.JWT_KEY,
            { expiresIn: 600 }
        );

        const resetLink = `${process.env.FRONTEND_ORIGIN}/reset-password?token=${token}`;

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            timeout: 5000
        });

        try {
            await transporter.sendMail({
                from: '"HackForge" <noreply@hackforge.com>',
                to: emailId,
                subject: "Reset Your Password - HackForge",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #f97316;">Reset Your Password</h2>
                        <p>Hello ${user.username},</p>
                        <p>You requested a password reset. Click the button below to set a new password:</p>
                        <a href="${resetLink}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 16px 0;">Reset Password</a>
                        <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
                        <p style="color: #666; font-size: 12px;">This link expires in 10 minutes. If you didn't request this, please ignore this email.</p>
                    </div>
                `
            });
            res.status(200).json({ message: "Password reset link sent to your email", resetLink });
        } catch (emailError) {
            console.error("Email sending error:", emailError.message);
            res.status(200).json({ 
                message: "Password reset link generated", 
                resetLink: resetLink,
                note: "Email sending failed, but you can use this link directly"
            });
        }

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ error: "Failed to process request. Please try again later." });
    }
};

module.exports = forgotPassword;
