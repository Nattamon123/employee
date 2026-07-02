package geo

import "math"

const earthRadiusMeters = 6_371_000.0

// HaversineDistance calculates the distance in meters between two GPS coordinates.
// Used by the attendance service to verify if an employee is within the geofence.
func HaversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
	dLat := degreesToRadians(lat2 - lat1)
	dLng := degreesToRadians(lng2 - lng1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(degreesToRadians(lat1))*math.Cos(degreesToRadians(lat2))*
			math.Sin(dLng/2)*math.Sin(dLng/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusMeters * c
}

// IsWithinRadius checks if a point is within a given radius (in meters) of a center point.
func IsWithinRadius(centerLat, centerLng, pointLat, pointLng float64, radiusM float64) bool {
	return HaversineDistance(centerLat, centerLng, pointLat, pointLng) <= radiusM
}

func degreesToRadians(deg float64) float64 {
	return deg * math.Pi / 180
}
