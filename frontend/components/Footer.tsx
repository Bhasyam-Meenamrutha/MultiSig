import { motion } from 'framer-motion';
import { Github, Twitter, MessageCircle, Mail, Shield, Zap, Globe } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-background border-t border-border/50 mt-20">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Section */}
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div 
                className="p-3 rounded-2xl"
                style={{
                  background: 'var(--gradient-primary)',
                  boxShadow: 'var(--shadow-neon-primary)'
                }}
              >
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Multi-Sig Vault
              </h3>
            </div>
            
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md">
              The future of collaborative finance. Secure, transparent, and completely decentralized 
              multi-signature vaults powered by cutting-edge blockchain technology.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              {[
                { icon: Github, href: "#", label: "GitHub" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: MessageCircle, href: "#", label: "Discord" },
                { icon: Mail, href: "#", label: "Email" }
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  className="p-3 rounded-2xl transition-all duration-500"
                  style={{
                    background: 'var(--gradient-glass)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid hsl(220 20% 25% / 0.4)'
                  }}
                  whileHover={{
                    scale: 1.1,
                    boxShadow: 'var(--shadow-neon-accent)',
                    borderColor: 'hsl(var(--accent) / 0.6)'
                  }}
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5 text-muted-foreground" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Product Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-bold text-foreground mb-6">Product</h4>
            <ul className="space-y-4">
              {[
                "Create Vault",
                "Dashboard",
                "Transaction History",
                "Security Features",
                "API Documentation"
              ].map((link, index) => (
                <li key={index}>
                  <motion.a
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors duration-300"
                    whileHover={{ x: 5 }}
                  >
                    {link}
                  </motion.a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-bold text-foreground mb-6">Company</h4>
            <ul className="space-y-4">
              {[
                "About Us",
                "Careers",
                "Blog",
                "Privacy Policy",
                "Terms of Service"
              ].map((link, index) => (
                <li key={index}>
                  <motion.a
                    href="#"
                    className="text-muted-foreground hover:text-secondary transition-colors duration-300"
                    whileHover={{ x: 5 }}
                  >
                    {link}
                  </motion.a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center pt-12 mt-12 border-t border-border/50"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center space-x-8 mb-6 md:mb-0">
            <p className="text-muted-foreground">
              © {currentYear} Multi-Sig Vault. All rights reserved.
            </p>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Network Online</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">99.9% Uptime</span>
              </div>
            </div>
          </div>

          {/* Built with Badge */}
          <motion.div
            className="flex items-center space-x-3 px-4 py-2 rounded-2xl"
            style={{
              background: 'var(--gradient-glass)',
              backdropFilter: 'blur(20px)',
              border: '1px solid hsl(220 20% 25% / 0.4)'
            }}
            whileHover={{
              scale: 1.05,
              boxShadow: 'var(--shadow-neon-primary)'
            }}
          >
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Powered by Blockchain
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Background Elements */}
      <div className="absolute top-10 left-20 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
      <div className="absolute bottom-20 right-40 w-3 h-3 bg-secondary/40 rounded-full animate-pulse"></div>
      <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-accent/50 rounded-full animate-pulse"></div>
    </footer>
  );
};

export default Footer;