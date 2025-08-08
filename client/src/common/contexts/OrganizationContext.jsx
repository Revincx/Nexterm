import { createContext, useContext, useEffect, useState } from "react";
import { UserContext } from "@/common/contexts/UserContext.jsx";
import { getRequest } from "@/common/utils/RequestUtil.js";

export const OrganizationContext = createContext({});

export const OrganizationProvider = ({ children }) => {
    const [organizations, setOrganizations] = useState([]);
    const { user, sessionToken } = useContext(UserContext);

    const loadOrganizations = async () => {
        try {
            const orgs = await getRequest("organizations");
            setOrganizations(orgs || []);
        } catch (error) {
            console.error("Failed to load organizations", error.message);
            setOrganizations([]);
        }
    };

    /**
     * Check if the current user has organization admin (owner) access for a given organization
     * @param {number} organizationId - The organization ID to check
     * @returns {boolean} - True if the user is an owner of the organization
     */
    const hasOrganizationAdminAccess = (organizationId) => {
        if (!organizationId || !organizations.length) return false;
        
        const org = organizations.find(org => org.id === organizationId);
        return org ? org.isOwner : false;
    };

    /**
     * Check if the current user can modify (edit, delete, duplicate) a server
     * @param {object} server - The server object
     * @returns {boolean} - True if the user can modify the server
     */
    const canModifyServer = (server) => {
        if (!server) return false;
        
        // For personal servers (accountId set), only the owner can modify
        if (server.accountId) {
            return true; // Assume if user can see the server, they own it for personal servers
        }
        
        // For organization servers, only organization owners can modify
        if (server.organizationId) {
            return hasOrganizationAdminAccess(server.organizationId);
        }
        
        return false;
    };

    useEffect(() => {
        if (user && sessionToken) {
            loadOrganizations();
        } else {
            setOrganizations([]);
        }
    }, [user, sessionToken]);

    return (
        <OrganizationContext.Provider value={{
            organizations,
            loadOrganizations,
            hasOrganizationAdminAccess,
            canModifyServer
        }}>
            {children}
        </OrganizationContext.Provider>
    );
};