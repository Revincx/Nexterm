import { useEffect, useRef, useState, useContext, useCallback } from "react";
import { UserContext } from "@/common/contexts/UserContext.jsx";
import { useAI } from "@/common/contexts/AIContext.jsx";
import { Terminal as Xterm } from "@xterm/xterm";
import { useTheme } from "@/common/contexts/ThemeContext.jsx";
import { useTerminalSettings } from "@/common/contexts/TerminalSettingsContext.jsx";
import { FitAddon } from "@xterm/addon-fit";
import SnippetsMenu from "./components/SnippetsMenu";
import AICommandPopover from "./components/AICommandPopover";
import { mdiCodeArray } from "@mdi/js";
import Icon from "@mdi/react";
import "@xterm/xterm/css/xterm.css";
import "./styles/xterm.sass";

const XtermRenderer = ({ session, disconnectFromServer, pve }) => {
    const ref = useRef(null);
    const termRef = useRef(null);
    const wsRef = useRef(null);
    const { sessionToken } = useContext(UserContext);
    const { theme } = useTheme();
    const { getCurrentTheme, selectedFont, fontSize, cursorStyle, cursorBlink, selectedTheme } = useTerminalSettings();
    const { isAIAvailable } = useAI();
    const [showSnippetsMenu, setShowSnippetsMenu] = useState(false);
    const [showAIPopover, setShowAIPopover] = useState(false);
    const [aiPopoverPosition, setAIPopoverPosition] = useState(null);

    const toggleSnippetsMenu = () => setShowSnippetsMenu(!showSnippetsMenu);

    const toggleAIPopover = () => {
        if (!showAIPopover && termRef.current) {
            const term = termRef.current;
            const terminalElement = ref.current;

            if (terminalElement) {
                const rect = terminalElement.getBoundingClientRect();
                const buffer = term.buffer.active;``

                const charWidth = rect.width / term.cols;
                const charHeight = rect.height / term.rows;

                const cursorX = rect.left + (buffer.cursorX * charWidth);
                const cursorY = rect.top + (buffer.cursorY * charHeight);

                setAIPopoverPosition({ x: cursorX, y: cursorY });
            }
        }
        setShowAIPopover(!showAIPopover);
    };

    const handleSnippetSelected = (command) => {
        if (termRef.current && wsRef.current) {
            const commandWithNewline = command.endsWith("\n") ? command : command + "\n";+
            wsRef.current.send(commandWithNewline);
            termRef.current.focus();
        }
    };

    const handleAICommandGenerated = (command) => {
        if (termRef.current && wsRef.current) {
            wsRef.current.send(command);
        }
    };

    // 处理复制功能 - 使用兼容性更好的方法
    const copyToClipboard = useCallback((text) => {
        // 创建一个临时文本区域来执行复制操作
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';  // 避免滚动到底部
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                console.log('复制成功');
            } else {
                console.log('复制命令执行但可能未成功');
                
                // 尝试使用现代API作为后备方案（仅在HTTPS环境中）
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text)
                        .then(() => console.log("使用现代API复制成功"))
                        .catch(err => console.error("现代API复制失败:", err));
                }
            }
        } catch (err) {
            console.error('复制失败:', err);
            
            // 尝试使用现代API作为后备方案（仅在HTTPS环境中）
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text)
                    .then(() => console.log("使用现代API复制成功"))
                    .catch(err => console.error("现代API复制失败:", err));
            }
        }
        
        document.body.removeChild(textArea);
    }, []);
    
    const handleCopy = useCallback((e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C' || e.keyCode === 67) && termRef.current) {
            e.preventDefault();
            e.stopPropagation();
            
            const selection = termRef.current.getSelection();
            if (selection) {
                copyToClipboard(selection);
            }
        }
    }, [copyToClipboard]);

    useEffect(() => {
        if (!sessionToken) return;

        const terminalTheme = getCurrentTheme();
        const isLightTerminalTheme = selectedTheme === "light";
        
        const term = new Xterm({
            cursorBlink: cursorBlink,
            cursorStyle: cursorStyle,
            fontSize: fontSize,
            fontFamily: selectedFont,
            theme: {
                background: (theme === "light" && isLightTerminalTheme) ? "#F3F3F3" : terminalTheme.background,
                foreground: (theme === "light" && isLightTerminalTheme) ? "#000000" : terminalTheme.foreground,
                black: terminalTheme.black,
                red: terminalTheme.red,
                green: terminalTheme.green,
                yellow: terminalTheme.yellow,
                blue: terminalTheme.blue,
                magenta: terminalTheme.magenta,
                cyan: terminalTheme.cyan,
                white: terminalTheme.white,
                brightBlack: terminalTheme.brightBlack,
                brightRed: terminalTheme.brightRed,
                brightGreen: terminalTheme.brightGreen,
                brightYellow: terminalTheme.brightYellow,
                brightBlue: terminalTheme.brightBlue,
                brightMagenta: terminalTheme.brightMagenta,
                brightCyan: terminalTheme.brightCyan,
                brightWhite: (theme === "light" && isLightTerminalTheme) ? "#464545" : terminalTheme.brightWhite,
                cursor: (theme === "light" && isLightTerminalTheme) ? "#000000" : terminalTheme.cursor
            },
        });

        termRef.current = term;

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(ref.current);

        const handleResize = () => {
            fitAddon.fit();
            wsRef.current.send(`\x01${term.cols},${term.rows}`);
        };

        // 添加自定义的复制事件处理函数
        const handleCopyEvent = (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C' || e.keyCode === 67)) {
                e.preventDefault();
                e.stopPropagation();
                
                const selection = term.getSelection();
                if (selection) {
                    // 使用通用的复制函数
                    copyToClipboard(selection);
                }
                
                return false;
            }
        };
        
        // 监听终端容器的按键事件
        ref.current.addEventListener("keydown", handleCopyEvent, true);

        window.addEventListener("resize", handleResize);

        const protocol = location.protocol === "https:" ? "wss" : "ws";

        let url;
        let ws;

        if (pve) {
            url = process.env.NODE_ENV === "production" ? `${window.location.host}/api/servers/pve-lxc` : "localhost:6989/api/servers/pve-lxc";
            
            let wsUrl = `${protocol}://${url}?sessionToken=${sessionToken}&serverId=${session.server}&containerId=${session.containerId}`;
            if (session.connectionReason) {
                wsUrl += `&connectionReason=${encodeURIComponent(session.connectionReason)}`;
            }
            
            ws = new WebSocket(wsUrl);
        } else {
            url = process.env.NODE_ENV === "production" ? `${window.location.host}/api/servers/sshd` : "localhost:6989/api/servers/sshd";

            let wsUrl = `${protocol}://${url}?sessionToken=${sessionToken}&serverId=${session.server}&identityId=${session.identity}`;
            if (session.connectionReason) {
                wsUrl += `&connectionReason=${encodeURIComponent(session.connectionReason)}`;
            }
            
            ws = new WebSocket(wsUrl);
        }

        wsRef.current = ws;

        let interval = setInterval(() => {
            if (ws.readyState === ws.OPEN) handleResize();
        }, 300);

        ws.onopen = () => {
            ws.send(`\x01${term.cols},${term.rows}`);
        }

        ws.onclose = (event) => {
            if (event.wasClean) {
                clearInterval(interval);
                disconnectFromServer(session.id);
            }
        };

        ws.onmessage = (event) => {
            const data = event.data;

            if (data.startsWith("\x02")) {
                const prompt = data.substring(1);
                term.write(prompt);

                let totpCode = "";
                const onKey = term.onKey((key) => {
                    if (key.domEvent.key === "Enter") {
                        ws.send(`\x03${totpCode}`);
                        term.write("\r\n");
                        totpCode = "";
                        onKey.dispose();
                    } else if (key.domEvent.key === "Backspace" && totpCode.length > 0) {
                        totpCode = totpCode.slice(0, -1);
                        term.write("\b \b");
                    } else {
                        totpCode += key.key;
                        term.write(key.key);
                    }
                });
            } else {
                term.write(data);
            }
        };

        term.onData((data) => {
            ws.send(data);
        });

        term.attachCustomKeyEventHandler((event) => {
            if (event.ctrlKey && event.key === "k" && event.type === "keydown" && isAIAvailable()) {
                event.preventDefault();
                toggleAIPopover();
                return false;
            }
            return true;
        });

        return () => {
            window.removeEventListener("resize", handleResize);
            ws.close();
            term.dispose();
            clearInterval(interval);
            termRef.current = null;
            wsRef.current = null;
        };
    }, [sessionToken, selectedFont, fontSize, cursorStyle, cursorBlink, selectedTheme]);

    return (
        <div className="xterm-container">
            <div ref={ref} className="xterm-wrapper" />
            <button 
                className={`snippets-button ${showSnippetsMenu ? 'hidden' : ''}`} 
                onClick={toggleSnippetsMenu} 
                title="Snippets"
            >
                <Icon path={mdiCodeArray} />
            </button>
            <SnippetsMenu 
                visible={showSnippetsMenu} 
                onClose={() => setShowSnippetsMenu(false)}
                onSelect={handleSnippetSelected}
            />
            {isAIAvailable() && (
                <AICommandPopover visible={showAIPopover} onClose={() => setShowAIPopover(false)}
                                  onCommandGenerated={handleAICommandGenerated} position={aiPopoverPosition}
                                  focusTerminal={() => termRef.current?.focus()} />
            )}
        </div>
    );
};

export default XtermRenderer;
