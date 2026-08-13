const axios = require('axios');
const logger = require('./logger');

/**
 * Tracking Service - Integrates with logistic partner APIs
 * Supports ShipRocket, Delhivery, Blue Dart, FedEx, DHL, and custom APIs
 */

// ShipRocket API Integration
async function trackShipRocket(awbNumber, apiKey, apiSecret) {
    try {
        // First, get auth token
        const authResponse = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: apiKey, // ShipRocket uses email as API key
            password: apiSecret
        }, {
            timeout: 10000
        });

        const token = authResponse.data.token;

        // Get tracking details
        const trackingResponse = await axios.get(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awbNumber}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            timeout: 10000
        });

        return {
            success: true,
            status: trackingResponse.data.tracking_data?.shipment_status || 'unknown',
            currentStatus: trackingResponse.data.tracking_data?.shipment_status || 'unknown',
            location: trackingResponse.data.tracking_data?.current_status_location || '',
            timeline: trackingResponse.data.tracking_data?.tracking || [],
            estimatedDelivery: trackingResponse.data.tracking_data?.estimated_delivery_date || null,
            provider: 'shiprocket'
        };
    } catch (error) {
        logger.error('ShipRocket tracking error:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'shiprocket'
        };
    }
}

// Delhivery API Integration
async function trackDelhivery(awbNumber, apiKey) {
    try {
        const response = await axios.get(`https://track.delhivery.com/api/packages/json/`, {
            params: {
                waybill: awbNumber,
                token: apiKey
            },
            timeout: 10000
        });

        const data = response.data?.ShipmentData?.[0]?.[0];
        if (!data) {
            throw new Error('No tracking data found');
        }

        return {
            success: true,
            status: data.Status?.Status || 'unknown',
            currentStatus: data.Status?.Status || 'unknown',
            location: data.Status?.StatusLocation || '',
            timeline: data.Status?.StatusDateTime ? [{
                status: data.Status.Status,
                location: data.Status.StatusLocation,
                timestamp: data.Status.StatusDateTime
            }] : [],
            estimatedDelivery: data.ExpectedDeliveryDate || null,
            provider: 'delhivery'
        };
    } catch (error) {
        logger.error('Delhivery tracking error:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'delhivery'
        };
    }
}

// Custom API Integration (Generic)
async function trackCustom(awbNumber, trackingEndpoint, apiKey, apiSecret) {
    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        if (apiSecret) {
            headers['X-API-Secret'] = apiSecret;
        }

        const response = await axios.get(trackingEndpoint.replace('{awb}', awbNumber), {
            headers,
            timeout: 10000
        });

        return {
            success: true,
            status: response.data.status || response.data.Status || 'unknown',
            currentStatus: response.data.currentStatus || response.data.status || 'unknown',
            location: response.data.location || response.data.Location || '',
            timeline: response.data.timeline || response.data.Timeline || [],
            estimatedDelivery: response.data.estimatedDelivery || response.data.EstimatedDelivery || null,
            provider: 'custom',
            rawData: response.data
        };
    } catch (error) {
        logger.error('Custom API tracking error:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'custom'
        };
    }
}

// Main tracking function
async function trackShipment(awbNumber, partner) {
    try {
        if (!partner.apiIntegration?.enabled) {
            return {
                success: false,
                error: 'API integration not enabled for this partner',
                provider: partner.apiIntegration?.apiType || 'none'
            };
        }

        const { apiType, apiKey, apiSecret, trackingEndpoint } = partner.apiIntegration;

        switch (apiType) {
            case 'shiprocket':
                return await trackShipRocket(awbNumber, apiKey, apiSecret);
            
            case 'delhivery':
                return await trackDelhivery(awbNumber, apiKey);
            
            case 'blue-dart':
            case 'fedex':
            case 'dhl':
                // These would need specific implementations
                logger.warn(`API integration for ${apiType} not yet implemented`);
                return {
                    success: false,
                    error: `${apiType} API integration coming soon`,
                    provider: apiType
                };
            
            case 'custom':
                if (!trackingEndpoint) {
                    return {
                        success: false,
                        error: 'Tracking endpoint not configured',
                        provider: 'custom'
                    };
                }
                return await trackCustom(awbNumber, trackingEndpoint, apiKey, apiSecret);
            
            default:
                return {
                    success: false,
                    error: 'Unknown API type',
                    provider: apiType
                };
        }
    } catch (error) {
        logger.error('Tracking service error:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'unknown'
        };
    }
}

// Update dispatch status from tracking API
async function updateDispatchFromTracking(dispatch, partner) {
    try {
        const trackingData = await trackShipment(dispatch.awbNumber, partner);
        
        if (trackingData.success) {
            // Map tracking status to dispatch status
            const statusMap = {
                'pending': 'dispatched',
                'picked_up': 'dispatched',
                'in_transit': 'in-transit',
                'out_for_delivery': 'out-for-delivery',
                'delivered': 'delivered',
                'failed': 'failed',
                'returned': 'returned'
            };

            const newStatus = statusMap[trackingData.status?.toLowerCase()] || dispatch.status;
            
            return {
                updated: newStatus !== dispatch.status,
                status: newStatus,
                trackingData: trackingData,
                location: trackingData.location,
                estimatedDelivery: trackingData.estimatedDelivery
            };
        }

        return {
            updated: false,
            error: trackingData.error,
            trackingData: trackingData
        };
    } catch (error) {
        logger.error('Error updating dispatch from tracking:', error.message);
        return {
            updated: false,
            error: error.message
        };
    }
}

module.exports = {
    trackShipment,
    updateDispatchFromTracking,
    trackShipRocket,
    trackDelhivery,
    trackCustom
};

