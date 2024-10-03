// Risk.cs
using System.ComponentModel.DataAnnotations;

namespace DevTrack.DAL.Models
{
    public class Risk
    {
        public int RiskId { get; set; }

        [Required(ErrorMessage = "Description is required.")]
        public string Description { get; set; }

        // ... other properties
    }
}