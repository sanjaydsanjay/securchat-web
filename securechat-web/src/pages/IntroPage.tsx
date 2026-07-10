import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import './IntroPage.css'

export default function IntroPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const handleAction = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
    }
    localStorage.setItem('hasVisited', 'true')
    navigate('/login')
  }

  return (
    <>
      {!user && (
        <div className="mobile-splash">
          <div className="mobile-splash-content">
            <img src="/media/mobile-splash.png" alt="SecureChat Mobile Welcome" className="splash-img" />
            <div className="splash-action">
              <button onClick={handleAction} className="btn splash-btn">Get Started</button>
              <button onClick={handleAction} className="btn splash-secondary-btn mt-4 bg-transparent border-2 border-white/20 text-white w-full py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                Already have an account? Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cn("intro-page-container", !user && "hide-on-mobile")}>
        <header className="chat-header">
            <div className="logo">💬 SecureChat <span>AI</span></div>
            <nav className="nav-menu">
                <a href="#how-it-works">How It Works</a>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <button onClick={handleAction} className="btn btn-pro-nav">Go Pro</button>
            </nav>
        </header>
    
        <section className="hero">
            <div className="hero-content">
                <h1>Privacy First.<br/>Communication Simplified.</h1>
                <p>Connect instantly and securely with our web app dashboard. Built with military-grade end-to-end encryption, ensuring your personal details stay your own.</p>
                <button onClick={handleAction} className="btn">Explore App Demo</button>
            </div>
            <div className="hero-media">
                <video autoPlay loop muted playsInline>
                    <source src="/media/hero-video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        </section>
    
        <section id="how-it-works" className="how-it-works">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">No emails, no phone numbers required. Complete anonymity in just three simple actions.</p>
            
            <div className="steps-container">
                <div className="step-card">
                    <div className="step-num">1</div>
                    <h3>Enter Unique ID</h3>
                    <p>Simply enter a specific 6-digit Unique ID to instantly locate your contact securely across the network.</p>
                </div>
                <div className="step-card">
                    <div className="step-num">2</div>
                    <h3>Send Encrypted Texts</h3>
                    <p>Chat seamlessly using our zero-knowledge framework where messages are encrypted right on your terminal.</p>
                </div>
                <div className="step-card">
                    <div className="step-num">3</div>
                    <h3>Manage with Control</h3>
                    <p>Clear histories or securely delete individual chat windows right from the administrative context menu.</p>
                </div>
            </div>
        </section>
    
        <section id="features" className="showcase-section">
            <div className="showcase-grid">
                <div className="showcase-text">
                    <h2>Designed for Multi-Platform Fluidity</h2>
                    <p>Whether you're operating on a widescreen desktop terminal or messaging on-the-go via mobile browsers, SecureChat AI scales layout dynamically to keep conversations crisp, clean, and highly readable.</p>
                </div>
                <div className="showcase-image">
                    <img src="/media/mobile-showcase.png" alt="Mobile UI layout structure" />
                </div>
            </div>
    
            <div className="showcase-grid reverse">
                <div className="showcase-text">
                    <h2>Pro Desktop Control Center</h2>
                    <p>Unlock a widescreen control layout complete with advanced analytics tracking, persistent sidebar control modules, and quick-action search indexing built for premium enterprise users.</p>
                </div>
                <div className="showcase-image">
                    <img src="/media/showcase1.png" alt="Desktop Web Layout Control Panel" />
                </div>
            </div>
        </section>
    
        <section id="pricing" className="pricing">
            <h2 className="section-title">Premium Access Plans</h2>
            <p className="section-subtitle">Upgrade to access higher data allocations, extended periods, and administrative cloud control features.</p>
            
            <div className="pricing-container">
                <div className="plan-card plan-free">
                    <div className="plan-header">
                        <h3>Free Chat</h3>
                        <div className="plan-price">₹0</div>
                        <div className="plan-duration">10 Days Duration</div>
                    </div>
                    <ul className="plan-features">
                        <li>10 Days Full Access</li>
                        <li>End-to-End Encryption</li>
                        <li>No Ads</li>
                        <li>Priority Ticket Support</li>
                    </ul>
                    <button onClick={handleAction} className="plan-btn" data-plan="free">Get Free Basic</button>
                </div>
    
                <div className="plan-card plan-basic">
                    <div className="plan-header">
                        <h3>Premium Basic</h3>
                        <div className="plan-price">₹150</div>
                        <div className="plan-duration">25 Days Duration</div>
                    </div>
                    <ul className="plan-features">
                        <li>25 Days Full Access</li>
                        <li>End-to-End Encryption</li>
                        <li>No Ads</li>
                        <li>Priority Ticket Support</li>
                    </ul>
                    <button onClick={handleAction} className="plan-btn" data-plan="basic">Buy Premium Basic</button>
                </div>
    
                <div className="plan-card plan-standard">
                    <div className="plan-header">
                        <h3>Premium Standard</h3>
                        <div className="plan-price">₹200</div>
                        <div className="plan-duration">45 Days Duration</div>
                    </div>
                    <ul className="plan-features">
                        <li>45 Days Full Access</li>
                        <li>All Basic Tier Features</li>
                        <li>Voice Messaging Enabled</li>
                        <li>Full Chat Export (.txt / .csv)</li>
                        <li>Secure Message Backup</li>
                    </ul>
                    <button onClick={handleAction} className="plan-btn" data-plan="standard">Buy Premium Standard</button>
                </div>
    
                <div className="plan-card plan-pro">
                    <div className="plan-header">
                        <h3>Premium Pro</h3>
                        <div className="plan-price">₹260</div>
                        <div className="plan-duration">60 Days Duration</div>
                    </div>
                    <ul className="plan-features">
                        <li>60 Days Full Access</li>
                        <li>All Standard Features</li>
                        <li>Unlimited File Upload Size</li>
                        <li>Scheduled Messages Queue</li>
                        <li>Admin Dashboard Module</li>
                    </ul>
                    <button onClick={handleAction} className="plan-btn" data-plan="pro">Buy Premium Pro</button>
                </div>
            </div>
        </section>
    
        <footer id="payment">
            <div className="footer-content">
                <div className="footer-info">
                    <h2>Ready to Unlock Full Power?</h2>
                    <p className="footer-desc">Scan our secure developer gateway node using any supported UPI mobile application to process upgrades securely instantly.</p>
                    <p className="support-node">Support Node: info@securechatai.io</p>
                </div>
                
                <div className="payment-box">
                    <h4>Developer Payment Details</h4>
                    <p className="upi-detail"><strong>UPI ID:</strong> <span>9353213719@fam</span></p>
                    <p className="phonepe-detail"><strong>PhonePe num:</strong> 9353213719</p>
                    <img className="qr-code" src="/media/qr-code.jpeg" alt="UPI Node QR Code Structure" />
                    <p className="qr-caption">Scan this QR code with any UPI app to pay</p>
                </div>
            </div>
            <div className="footer-bottom">
                &copy; 2026 SecureChat AI Network Systems. All rights reserved. End-to-End Encrypted Data Pipeline.
            </div>
        </footer>
      </div>
    </>
  )
}
