package com.extech.mpms.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthService.UserProfile login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        AuthService.UserProfile profile = authService.login(
                request.username(),
                request.password(),
                clientIp(httpRequest)
        );
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(UserContext.SESSION_KEY, new UserContext(
                profile.puid(),
                profile.userId(),
                profile.displayName(),
                profile.roleCode()
        ));
        return profile;
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        UserContext user = session == null
                ? null
                : (UserContext) session.getAttribute(UserContext.SESSION_KEY);
        authService.logout(user, clientIp(httpRequest));
        if (session != null) {
            session.invalidate();
        }
        return Map.of("ok", true);
    }

    @GetMapping("/me")
    public AuthService.UserProfile me(HttpServletRequest httpRequest) {
        UserContext user = (UserContext) httpRequest.getAttribute(AuthInterceptor.CURRENT_USER_ATTRIBUTE);
        return authService.profile(user);
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public record LoginRequest(String username, String password) {
    }
}
