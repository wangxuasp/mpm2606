package com.extech.mpms.config;

import com.extech.mpms.auth.AuthInterceptor;
import com.extech.mpms.auth.WriteFrozenInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AuthConfig implements WebMvcConfigurer {

    @Value("${app.write-frozen:false}")
    private boolean writeFrozen;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new WriteFrozenInterceptor(writeFrozen))
                .addPathPatterns("/api/**");
        registry.addInterceptor(new AuthInterceptor())
                .addPathPatterns("/api/workspace/**", "/api/workflow/**", "/api/org/**",
                        "/api/meta/**", "/api/objects/**", "/api/auth/me")
                .addPathPatterns("/api/mpm/occurrence", "/api/mpm/occurrence/**",
                        "/api/mpm/accountability-check", "/api/mpm/create-and-mount",
                        "/api/mpm/clone-subtree");
    }
}
